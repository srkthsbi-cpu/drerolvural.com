// Erol Vural - Cloudflare Pages Advanced Mode Worker
// Admin API + Public API + R2 Media + Sitemap + 404 fallback

async function handleAdmin(context) {
  const LANGS = ['tr','en','de','ar','ru','az','sq','nl','es'];
  const COOKIE = 'erol_admin_session';
  const SESSION_TTL = 60 * 60 * 8;
  const MAX_LOGIN_ATTEMPTS = 7;
  const LOGIN_WINDOW = 15 * 60;

  function json(data, status = 200, extra = {}) {
    return new Response(JSON.stringify(data), {
      status,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        ...extra
      }
    });
  }

  function now() {
    return Math.floor(Date.now() / 1000);
  }

  function iso() {
    return new Date().toISOString();
  }

  function b64(bytes) {
    return btoa(
      String.fromCharCode(...new Uint8Array(bytes))
    )
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  function unb64(s) {
    s = s.replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    return Uint8Array.from(atob(s), c => c.charCodeAt(0));
  }

  async function randomToken() {
    return b64(crypto.getRandomValues(new Uint8Array(32)));
  }

  async function sha256(text) {
    return b64(
      await crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(text)
      )
    );
  }

  async function derive(password, salt) {
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(password),
      'PBKDF2',
      false,
      ['deriveBits']
    );

    const bits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: unb64(salt),
        iterations: 150000,
        hash: 'SHA-256'
      },
      key,
      256
    );

    return b64(bits);
  }

  async function hashPassword(password) {
    const salt = await randomToken();
    return `pbkdf2$150000$${salt}$${await derive(password, salt)}`;
  }

  async function verifyPassword(password, stored) {
    const p = stored.split('$');

    if (
      p.length !== 4 ||
      p[0] !== 'pbkdf2'
    ) {
      return false;
    }

    const got = await derive(password, p[2]);

    return got === p[3];
  }

  function parseCookie(req) {
    const out = {};

    for (
      const part of (req.headers.get('Cookie') || '').split(';')
    ) {
      const i = part.indexOf('=');

      if (i > 0) {
        out[
          part.slice(0, i).trim()
        ] = decodeURIComponent(
          part.slice(i + 1).trim()
        );
      }
    }

    return out;
  }

  async function session(req, env) {
    const id = parseCookie(req)[COOKIE];

    if (!id) return null;

    const row = await env.DB
      .prepare(
        'SELECT id,username,csrf,expires_at FROM sessions WHERE id=? AND expires_at>?'
      )
      .bind(id, now())
      .first();

    return row || null;
  }

  function cookie(name, value, maxAge) {
    return `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Strict`;
  }

  async function requireAuth(req, env) {
    const s = await session(req, env);

    if (!s) {
      throw new Response(
        JSON.stringify({
          error: 'Unauthorized'
        }),
        {
          status: 401,
          headers: {
            'content-type': 'application/json'
          }
        }
      );
    }

    return s;
  }

  async function body(req) {
    return await req.json();
  }

  function ip(req) {
    return (
      req.headers.get('CF-Connecting-IP') ||
      'unknown'
    );
  }

  async function audit(
    env,
    s,
    action,
    target,
    req
  ) {
    await env.DB
      .prepare(
        'INSERT INTO audit_logs(username,action,target,ip,created_at) VALUES(?,?,?,?,?)'
      )
      .bind(
        s?.username || 'system',
        action,
        target || '',
        ip(req),
        iso()
      )
      .run();
  }

  function cleanLangMap(x) {
    const o = {};

    for (const l of LANGS) {
      if (
        x &&
        typeof x[l] === 'string'
      ) {
        o[l] = x[l].trim();
      }
    }

    return o;
  }

  async function ensureSchema(env) {
    const stmts = [
      `CREATE TABLE IF NOT EXISTS admin_users (
        username TEXT PRIMARY KEY,
        password_hash TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,

      `CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL,
        csrf TEXT NOT NULL,
        expires_at INTEGER NOT NULL,
        created_at INTEGER NOT NULL
      )`,

      `CREATE INDEX IF NOT EXISTS idx_sessions_expires
       ON sessions(expires_at)`,

      `CREATE TABLE IF NOT EXISTS login_attempts (
        ip TEXT PRIMARY KEY,
        attempts INTEGER NOT NULL DEFAULT 0,
        window_started_at INTEGER NOT NULL
      )`,

      `CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL,
        action TEXT NOT NULL,
        target TEXT,
        ip TEXT,
        created_at TEXT NOT NULL
      )`,

      `CREATE TABLE IF NOT EXISTS banners (
        position INTEGER PRIMARY KEY,
        desktop_file TEXT NOT NULL,
        mobile_file TEXT,
        alt_json TEXT NOT NULL DEFAULT '{}',
        title_json TEXT NOT NULL DEFAULT '{}',
        description_json TEXT NOT NULL DEFAULT '{}',
        button_text_json TEXT NOT NULL DEFAULT '{}',
        button_url TEXT NOT NULL DEFAULT '',
        enabled INTEGER NOT NULL DEFAULT 1,
        updated_at TEXT NOT NULL
      )`,

      `CREATE TABLE IF NOT EXISTS posts (
        id TEXT PRIMARY KEY,
        published INTEGER NOT NULL DEFAULT 0,
        featured INTEGER NOT NULL DEFAULT 0,
        icon TEXT NOT NULL DEFAULT 'fa-file-medical',
        category_json TEXT NOT NULL DEFAULT '{}',
        title_json TEXT NOT NULL DEFAULT '{}',
        description_json TEXT NOT NULL DEFAULT '{}',
        content_json TEXT NOT NULL DEFAULT '{}',
        slug_json TEXT NOT NULL DEFAULT '{}',
        meta_title_json TEXT NOT NULL DEFAULT '{}',
        meta_description_json TEXT NOT NULL DEFAULT '{}',
        keywords_json TEXT NOT NULL DEFAULT '{}',
        cover_file TEXT,
        published_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,

      `CREATE INDEX IF NOT EXISTS idx_posts_published
       ON posts(published, featured, published_at)`,

      `CREATE TABLE IF NOT EXISTS site_settings (
        key TEXT PRIMARY KEY,
        value_json TEXT NOT NULL DEFAULT '{}',
        updated_at TEXT NOT NULL
      )`
    ];

    for (const q of stmts) {
      await env.DB.prepare(q).run();
    }
  }

  async function seedIfNeeded(env) {
    const t = iso();

    const count = await env.DB
      .prepare(
        'SELECT COUNT(*) AS c FROM banners'
      )
      .first();

    if (!count || Number(count.c) === 0) {
      const defaults = [1, 2, 3].map(i => ({
        position: i,
        desktop_file: `banner${i}.png`,
        mobile_file: null,
        alt: {
          tr: `Doç. Dr. Erol Vural – Banner ${i}`
        },
        title: {},
        description: {},
        button_text: {},
        button_url: '',
        enabled: 1
      }));

      for (const b of defaults) {
        await env.DB
          .prepare(
            `INSERT OR IGNORE INTO banners
            (
              position,
              desktop_file,
              mobile_file,
              alt_json,
              title_json,
              description_json,
              button_text_json,
              button_url,
              enabled,
              updated_at
            )
            VALUES(?,?,?,?,?,?,?,?,?,?)`
          )
          .bind(
            b.position,
            b.desktop_file,
            b.mobile_file,
            JSON.stringify(b.alt),
            JSON.stringify(b.title),
            JSON.stringify(b.description),
            JSON.stringify(b.button_text),
            b.button_url,
            b.enabled,
            t
          )
          .run();
      }
    }

    const pc = await env.DB
      .prepare(
        'SELECT COUNT(*) AS c FROM posts'
      )
      .first();

    if (!pc || Number(pc.c) === 0) {
      try {
        const req = new Request(
          'https://local/data/blogs.json'
        );

        const r = await env.ASSETS.fetch(req);

        if (r.ok) {
          const arr = await r.json();

          for (const x of arr) {
            await env.DB
              .prepare(
                `INSERT OR IGNORE INTO posts
                (
                  id,
                  published,
                  featured,
                  icon,
                  category_json,
                  title_json,
                  description_json,
                  content_json,
                  slug_json,
                  meta_title_json,
                  meta_description_json,
                  keywords_json,
                  cover_file,
                  published_at,
                  created_at,
                  updated_at
                )
                VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
              )
              .bind(
                String(x.id),
                x.published ? 1 : 0,
                x.featured ? 1 : 0,
                String(
                  x.icon ||
                  'fa-file-medical'
                ),
                JSON.stringify(
                  cleanLangMap(x.category)
                ),
                JSON.stringify(
                  cleanLangMap(x.title)
                ),
                JSON.stringify(
                  cleanLangMap(x.description)
                ),
                JSON.stringify(
                  cleanLangMap(x.content)
                ),
                JSON.stringify(
                  cleanLangMap(x.slug)
                ),
                JSON.stringify(
                  cleanLangMap(x.meta_title)
                ),
                JSON.stringify(
                  cleanLangMap(x.meta_description)
                ),
                JSON.stringify(
                  cleanLangMap(x.keywords)
                ),
                x.cover_file || null,
                x.published_at || null,
                x.created_at || t,
                x.updated_at || t
              )
              .run();
          }
        }
      } catch (e) {
        console.log(
          'Seed blogs skipped',
          e
        );
      }
    }

    const defaults = {
      site_title: {
        tr: 'Doç. Dr. Erol Vural',
        en: 'Assoc. Prof. Dr. Erol Vural'
      },

      site_description: {
        tr: 'Metabolik ve Bariatrik Cerrahi',
        en: 'Metabolic and Bariatric Surgery'
      },

      phone: '+90 541 456 93 67',

      whatsapp: '905414569367',

      email: 'info@drerolvural.com',

      instagram:
        'https://instagram.com/tupmidedoktoru',

      facebook:
        'https://www.facebook.com/share/17z6BLuViw/?mibextid=wwXIfr'
    };

    for (
      const [k, v] of Object.entries(defaults)
    ) {
      await env.DB
        .prepare(
          `INSERT OR IGNORE INTO site_settings
          (key,value_json,updated_at)
          VALUES(?,?,?)`
        )
        .bind(
          k,
          JSON.stringify(v),
          t
        )
        .run();
    }
  }

  async function onRequest(context) {
    const { request, env } = context;

    if (!env.DB) {
      return json(
        {
          error:
            'D1 binding (DB) is not configured.'
        },
        500
      );
    }

    const url = new URL(request.url);

    const path = url.pathname
      .replace(/^\/api\/?/, '')
      .replace(/\/$/, '');

    const method =
      request.method.toUpperCase();

    try {
      await ensureSchema(env);
      await seedIfNeeded(env);

      if (
        path === 'auth/login' &&
        method === 'POST'
      ) {
        const b = await body(request);

        const username =
          String(
            b.username || ''
          ).trim();

        const password =
          String(
            b.password || ''
          );

        if (!username || !password) {
          return json(
            {
              error:
                'Kullanıcı adı ve şifre gerekli.'
            },
            400
          );
        }

        const ipx = ip(request);

        const a = await env.DB
          .prepare(
            'SELECT * FROM login_attempts WHERE ip=?'
          )
          .bind(ipx)
          .first();

        const n = now();

        if (
          a &&
          n - a.window_started_at <
            LOGIN_WINDOW &&
          a.attempts >=
            MAX_LOGIN_ATTEMPTS
        ) {
          return json(
            {
              error:
                'Çok fazla başarısız giriş. 15 dakika sonra tekrar deneyin.'
            },
            429
          );
        }

        let user = await env.DB
          .prepare(
            'SELECT username,password_hash FROM admin_users WHERE username=?'
          )
          .bind(username)
          .first();

        let ok = false;

        if (user) {
          ok =
            await verifyPassword(
              password,
              user.password_hash
            );
        } else if (
          username ===
            (env.ADMIN_USERNAME ||
              'admin') &&
          env.ADMIN_INITIAL_PASSWORD
        ) {
          ok =
            password ===
            env.ADMIN_INITIAL_PASSWORD;
        }

        if (!ok) {
          if (
            !a ||
            n - a.window_started_at >=
              LOGIN_WINDOW
          ) {
            await env.DB
              .prepare(
                `INSERT OR REPLACE INTO login_attempts
                (ip,attempts,window_started_at)
                VALUES(?,?,?)`
              )
              .bind(
                ipx,
                1,
                n
              )
              .run();
          } else {
            await env.DB
              .prepare(
                'UPDATE login_attempts SET attempts=attempts+1 WHERE ip=?'
              )
              .bind(ipx)
              .run();
          }

          return json(
            {
              error:
                'Kullanıcı adı veya şifre hatalı.'
            },
            401
          );
        }

        if (!user) {
          const ph =
            await hashPassword(
              password
            );

          await env.DB
            .prepare(
              `INSERT INTO admin_users
              (username,password_hash,created_at,updated_at)
              VALUES(?,?,?,?)`
            )
            .bind(
              username,
              ph,
              iso(),
              iso()
            )
            .run();
        }

        await env.DB
          .prepare(
            'DELETE FROM login_attempts WHERE ip=?'
          )
          .bind(ipx)
          .run();

        const sid =
          await randomToken();

        const csrf =
          await randomToken();

        const exp =
          n + SESSION_TTL;

        await env.DB
          .prepare(
            `INSERT INTO sessions
            (id,username,csrf,expires_at,created_at)
            VALUES(?,?,?,?,?)`
          )
          .bind(
            sid,
            username,
            csrf,
            exp,
            n
          )
          .run();

        await audit(
          env,
          { username },
          'login',
          '',
          request
        );

        return json(
          {
            ok: true,
            csrf,
            username
          },
          200,
          {
            'set-cookie':
              cookie(
                COOKIE,
                sid,
                SESSION_TTL
              )
          }
        );
      }

      if (
        path === 'auth/logout' &&
        method === 'POST'
      ) {
        const s =
          await session(
            request,
            env
          );

        if (s) {
          await env.DB
            .prepare(
              'DELETE FROM sessions WHERE id=?'
            )
            .bind(s.id)
            .run();

          await audit(
            env,
            s,
            'logout',
            '',
            request
          );
        }

        return json(
          { ok: true },
          200,
          {
            'set-cookie':
              cookie(
                COOKIE,
                '',
                0
              )
          }
        );
      }

      if (
        path === 'auth/me' &&
        method === 'GET'
      ) {
        const s =
          await session(
            request,
            env
          );

        if (!s) {
          return json({
            authenticated: false
          });
        }

        return json({
          authenticated: true,
          username: s.username,
          csrf: s.csrf,
          expiresAt:
            s.expires_at
        });
      }

      const s =
        await requireAuth(
          request,
          env
        );

      if (
        ['POST', 'PUT', 'DELETE']
          .includes(method)
      ) {
        const token =
          request.headers.get(
            'X-CSRF-Token'
          );

        if (
          !token ||
          token !== s.csrf
        ) {
          return json(
            {
              error:
                'CSRF doğrulaması başarısız.'
            },
            403
          );
        }
      }

      if (
        path === 'health' &&
        method === 'GET'
      ) {
        const items = {
          D1: !!env.DB,
          R2: !!env.MEDIA,
          Assets: !!env.ASSETS
        };

        return json({
          ok:
            !!env.DB &&
            !!env.MEDIA,
          items
        });
      }

      if (
        path === 'dashboard' &&
        method === 'GET'
      ) {
        const [
          p,
          b,
          d,
          l
        ] =
          await Promise.all([
            env.DB
              .prepare(
                'SELECT COUNT(*) c FROM posts'
              )
              .first(),

            env.DB
              .prepare(
                'SELECT COUNT(*) c FROM banners WHERE enabled=1'
              )
              .first(),

            env.DB
              .prepare(
                'SELECT COUNT(*) c FROM posts WHERE published=0'
              )
              .first(),

            env.DB
              .prepare(
                'SELECT * FROM audit_logs ORDER BY id DESC LIMIT 10'
              )
              .all()
          ]);

        return json({
          posts: p?.c || 0,
          banners: b?.c || 0,
          drafts: d?.c || 0,
          logs:
            l?.results || []
        });
      }

      if (
        path === 'banners' &&
        method === 'GET'
      ) {
        const r =
          await env.DB
            .prepare(
              'SELECT * FROM banners ORDER BY position'
            )
            .all();

        return json(
          r.results.map(
            x => ({
              ...x,
              alt: JSON.parse(
                x.alt_json || '{}'
              ),
              title: JSON.parse(
                x.title_json || '{}'
              ),
              description:
                JSON.parse(
                  x.description_json ||
                    '{}'
                ),
              button_text:
                JSON.parse(
                  x.button_text_json ||
                    '{}'
                )
            })
          )
        );
      }

      if (
        path === 'banners' &&
        method === 'PUT'
      ) {
        const b =
          await body(request);

        const arr =
          Array.isArray(b)
            ? b
            : [b];

        for (
          const x of arr
        ) {
          if (
            ![1, 2, 3].includes(
              Number(x.position)
            )
          ) continue;

          await env.DB
            .prepare(
              `UPDATE banners SET
              desktop_file=?,
              mobile_file=?,
              alt_json=?,
              title_json=?,
              description_json=?,
              button_text_json=?,
              button_url=?,
              enabled=?,
              updated_at=?
              WHERE position=?`
            )
            .bind(
              String(
                x.desktop_file ||
                  `banner${x.position}.png`
              ),
              x.mobile_file ||
                null,
              JSON.stringify(
                cleanLangMap(
                  x.alt
                )
              ),
              JSON.stringify(
                cleanLangMap(
                  x.title
                )
              ),
              JSON.stringify(
                cleanLangMap(
                  x.description
                )
              ),
              JSON.stringify(
                cleanLangMap(
                  x.button_text
                )
              ),
              String(
                x.button_url || ''
              ),
              x.enabled === false
                ? 0
                : 1,
              iso(),
              Number(
                x.position
              )
            )
            .run();
        }

        await audit(
          env,
          s,
          'banners.update',
          'all',
          request
        );

        return json({
          ok: true
        });
      }

      if (
        path === 'banners/upload' &&
        method === 'POST'
      ) {
        if (!env.MEDIA) {
          return json(
            {
              error:
                'R2 binding (MEDIA) is not configured.'
            },
            500
          );
        }

        const form =
          await request.formData();

        const file =
          form.get('file');

        const position =
          Number(
            form.get('position')
          );

        const variant =
          String(
            form.get('variant') ||
              'desktop'
          );

        if (
          !(file instanceof File) ||
          ![1, 2, 3].includes(
            position
          ) ||
          ![
            'desktop',
            'mobile'
          ].includes(variant)
        ) {
          return json(
            {
              error:
                'Geçersiz yükleme.'
            },
            400
          );
        }

        if (
          file.size >
          10 * 1024 * 1024
        ) {
          return json(
            {
              error:
                'Maksimum 10 MB.'
            },
            400
          );
        }

        if (
          ![
            'image/png',
            'image/jpeg',
            'image/webp'
          ].includes(file.type)
        ) {
          return json(
            {
              error:
                'Sadece PNG, JPG veya WebP.'
            },
            400
          );
        }

        const ext =
          file.type ===
          'image/png'
            ? 'png'
            : file.type ===
              'image/webp'
              ? 'webp'
              : 'jpg';

        const key =
          `banners/${position}-${variant}-${Date.now()}.${ext}`;

        await env.MEDIA.put(
          key,
          file.stream(),
          {
            httpMetadata: {
              contentType:
                file.type,
              cacheControl:
                'public, max-age=31536000, immutable'
            }
          }
        );

        const publicPath =
          `/media/${key}`;

        const col =
          variant ===
          'mobile'
            ? 'mobile_file'
            : 'desktop_file';

        await env.DB
          .prepare(
            `UPDATE banners SET ${col}=?,updated_at=? WHERE position=?`
          )
          .bind(
            publicPath,
            iso(),
            position
          )
          .run();

        await audit(
          env,
          s,
          'banner.upload',
          key,
          request
        );

        return json({
          ok: true,
          file: publicPath
        });
      }

      if (
        path === 'posts' &&
        method === 'GET'
      ) {
        const r =
          await env.DB
            .prepare(
              'SELECT * FROM posts ORDER BY COALESCE(published_at,created_at) DESC'
            )
            .all();

        return json(
          r.results.map(
            x => fromPost(x)
          )
        );
      }

      if (
        path === 'posts' &&
        method === 'POST'
      ) {
        const x =
          await body(request);

        const id =
          String(
            x.id ||
              crypto.randomUUID()
          );

        const t = iso();

        await env.DB
          .prepare(
            `INSERT INTO posts
            (
              id,
              published,
              featured,
              icon,
              category_json,
              title_json,
              description_json,
              content_json,
              slug_json,
              meta_title_json,
              meta_description_json,
              keywords_json,
              cover_file,
              published_at,
              created_at,
              updated_at
            )
            VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
          )
          .bind(
            id,
            x.published ? 1 : 0,
            x.featured ? 1 : 0,
            String(
              x.icon ||
                'fa-file-medical'
            ),
            JSON.stringify(
              cleanLangMap(
                x.category
              )
            ),
            JSON.stringify(
              cleanLangMap(
                x.title
              )
            ),
            JSON.stringify(
              cleanLangMap(
                x.description
              )
            ),
            JSON.stringify(
              cleanLangMap(
                x.content
              )
            ),
            JSON.stringify(
              cleanLangMap(
                x.slug
              )
            ),
            JSON.stringify(
              cleanLangMap(
                x.meta_title
              )
            ),
            JSON.stringify(
              cleanLangMap(
                x.meta_description
              )
            ),
            JSON.stringify(
              cleanLangMap(
                x.keywords
              )
            ),
            x.cover_file ||
              null,
            x.published_at ||
              null,
            t,
            t
          )
          .run();

        await audit(
          env,
          s,
          'post.create',
          id,
          request
        );

        return json({
          ok: true,
          id
        });
      }

      if (
        path.startsWith('posts/') &&
        method === 'PUT'
      ) {
        const id =
          decodeURIComponent(
            path.slice(6)
          );

        const x =
          await body(request);

        const t = iso();

        await env.DB
          .prepare(
            `UPDATE posts SET
            published=?,
            featured=?,
            icon=?,
            category_json=?,
            title_json=?,
            description_json=?,
            content_json=?,
            slug_json=?,
            meta_title_json=?,
            meta_description_json=?,
            keywords_json=?,
            cover_file=?,
            published_at=?,
            updated_at=?
            WHERE id=?`
          )
          .bind(
            x.published ? 1 : 0,
            x.featured ? 1 : 0,
            String(
              x.icon ||
                'fa-file-medical'
            ),
            JSON.stringify(
              cleanLangMap(
                x.category
              )
            ),
            JSON.stringify(
              cleanLangMap(
                x.title
              )
            ),
            JSON.stringify(
              cleanLangMap(
                x.description
              )
            ),
            JSON.stringify(
              cleanLangMap(
                x.content
              )
            ),
            JSON.stringify(
              cleanLangMap(
                x.slug
              )
            ),
            JSON.stringify(
              cleanLangMap(
                x.meta_title
              )
            ),
            JSON.stringify(
              cleanLangMap(
                x.meta_description
              )
            ),
            JSON.stringify(
              cleanLangMap(
                x.keywords
              )
            ),
            x.cover_file ||
              null,
            x.published_at ||
              null,
            t,
            id
          )
          .run();

        await audit(
          env,
          s,
          'post.update',
          id,
          request
        );

        return json({
          ok: true
        });
      }

      if (
        path.startsWith('posts/') &&
        method === 'DELETE'
      ) {
        const id =
          decodeURIComponent(
            path.slice(6)
          );

        await env.DB
          .prepare(
            'DELETE FROM posts WHERE id=?'
          )
          .bind(id)
          .run();

        await audit(
          env,
          s,
          'post.delete',
          id,
          request
        );

        return json({
          ok: true
        });
      }

      if (path === 'media/list' && method === 'GET') {
        if (!env.MEDIA) return json({error:'R2 binding (MEDIA) is not configured.'},500);
        const listed = await env.MEDIA.list({prefix:'international-assets/'});
        return json({ok:true, files:(listed.objects||[]).map(o=>({key:o.key,file:'/media/'+o.key,size:o.size,uploaded:o.uploaded}))});
      }

      if (path === 'media/delete' && method === 'POST') {
        if (!env.MEDIA) return json({error:'R2 binding (MEDIA) is not configured.'},500);
        const x = await body(request); const key=String(x.key||'');
        if (!/^international-assets\/[A-Za-z0-9._-]+$/.test(key)) return json({error:'Geçersiz görsel yolu.'},400);
        await env.MEDIA.delete(key); await audit(env,s,'media.delete',key,request); return json({ok:true});
      }

      if (
        path === 'media/upload' &&
        method === 'POST'
      ) {
        if (!env.MEDIA) {
          return json(
            {
              error:
                'R2 binding (MEDIA) is not configured.'
            },
            500
          );
        }

        const form =
          await request.formData();

        const file =
          form.get('file');

        if (
          !(file instanceof File)
        ) {
          return json(
            {
              error:
                'Dosya gerekli.'
            },
            400
          );
        }

        if (
          file.size >
          10 * 1024 * 1024
        ) {
          return json(
            {
              error:
                'Maksimum 10 MB.'
            },
            400
          );
        }

        if (!['image/jpeg','image/png'].includes(file.type)) {
          return json({error:'Sadece JPG, JPEG veya PNG görseller yüklenebilir.'},400);
        }
        const requestedName=String(form.get('filename')||'').trim();
        const safeName=requestedName?requestedName.replace(/[^A-Za-z0-9._-]+/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,''):'';
        if (safeName && !/\.(jpe?g|png)$/i.test(safeName)) return json({error:'Dosya adı .jpg, .jpeg veya .png ile bitmeli.'},400);
        const key=safeName?`international-assets/${safeName}`:`uploads/${Date.now()}-${crypto.randomUUID()}.${file.type==='image/png'?'png':'jpg'}`;

        await env.MEDIA.put(
          key,
          file.stream(),
          {
            httpMetadata: {
              contentType:
                file.type,
              cacheControl:
                'public, max-age=31536000, immutable'
            }
          }
        );

        await audit(
          env,
          s,
          'media.upload',
          key,
          request
        );

        return json({
          ok: true,
          file:
            `/media/${key}`
        });
      }

      if (
        path === 'password' &&
        method === 'POST'
      ) {
        const x =
          await body(request);

        const old =
          String(
            x.oldPassword || ''
          );

        const next =
          String(
            x.newPassword || ''
          );

        if (
          next.length < 12
        ) {
          return json(
            {
              error:
                'Yeni şifre en az 12 karakter olmalı.'
            },
            400
          );
        }

        const u =
          await env.DB
            .prepare(
              'SELECT password_hash FROM admin_users WHERE username=?'
            )
            .bind(s.username)
            .first();

        if (
          !u ||
          !(await verifyPassword(
            old,
            u.password_hash
          ))
        ) {
          return json(
            {
              error:
                'Mevcut şifre hatalı.'
            },
            400
          );
        }

        await env.DB
          .prepare(
            'UPDATE admin_users SET password_hash=?,updated_at=? WHERE username=?'
          )
          .bind(
            await hashPassword(
              next
            ),
            iso(),
            s.username
          )
          .run();

        await audit(
          env,
          s,
          'password.change',
          s.username,
          request
        );

        return json({
          ok: true
        });
      }

      if (
        path === 'settings' &&
        method === 'GET'
      ) {
        const r =
          await env.DB
            .prepare(
              'SELECT key,value_json FROM site_settings ORDER BY key'
            )
            .all();

        const out = {};

        for (
          const x of r.results
        ) {
          try {
            out[x.key] =
              JSON.parse(
                x.value_json
              );
          } catch {
            out[x.key] =
              x.value_json;
          }
        }

        return json(out);
      }

      if (
        path === 'settings' &&
        method === 'PUT'
      ) {
        const x =
          await body(request);

        for (
          const [k, v] of Object.entries(
            x || {}
          )
        ) {
          if (
            !/^[a-z0-9_]{1,60}$/.test(
              k
            )
          ) continue;

          await env.DB
            .prepare(
              `INSERT OR REPLACE INTO site_settings
              (key,value_json,updated_at)
              VALUES(?,?,?)`
            )
            .bind(
              k,
              JSON.stringify(v),
              iso()
            )
            .run();
        }

        await audit(
          env,
          s,
          'settings.update',
          'site',
          request
        );

        return json({
          ok: true
        });
      }

      if (
        path === 'backup' &&
        method === 'GET'
      ) {
        const [
          b,
          p,
          st
        ] =
          await Promise.all([
            env.DB
              .prepare(
                'SELECT * FROM banners ORDER BY position'
              )
              .all(),

            env.DB
              .prepare(
                'SELECT * FROM posts ORDER BY created_at'
              )
              .all(),

            env.DB
              .prepare(
                'SELECT * FROM site_settings'
              )
              .all()
          ]);

        return json({
          exportedAt: iso(),
          banners:
            b.results,
          posts:
            p.results,
          settings:
            st.results
        });
      }

      return json(
        {
          error:
            'Not found'
        },
        404
      );

    } catch (e) {
      console.error(e);

      if (
        e instanceof Response
      ) {
        return e;
      }

      return json(
        {
          error:
            'Sunucu hatası.',
          detail:
            String(
              e?.message || e
            )
        },
        500
      );
    }
  }

  function fromPost(x) {
    return {
      ...x,

      published:
        !!x.published,

      featured:
        !!x.featured,

      category:
        JSON.parse(
          x.category_json ||
            '{}'
        ),

      title:
        JSON.parse(
          x.title_json ||
            '{}'
        ),

      description:
        JSON.parse(
          x.description_json ||
            '{}'
        ),

      content:
        JSON.parse(
          x.content_json ||
            '{}'
        ),

      slug:
        JSON.parse(
          x.slug_json ||
            '{}'
        ),

      meta_title:
        JSON.parse(
          x.meta_title_json ||
            '{}'
        ),

      meta_description:
        JSON.parse(
          x.meta_description_json ||
            '{}'
        ),

      keywords:
        JSON.parse(
          x.keywords_json ||
            '{}'
        )
    };
  }

  return onRequest(context);
}


async function handlePublic(context) {

  function json(
    d,
    s = 200
  ) {
    return new Response(
      JSON.stringify(d),
      {
        status: s,
        headers: {
          'content-type':
            'application/json;charset=utf-8',
          'cache-control':
            'public, max-age=60'
        }
      }
    );
  }

  async function staticJSON(
    env,
    path,
    request
  ) {
    try {
      const r =
        await env.ASSETS.fetch(
          new Request(
            new URL(
              path,
              request.url
            )
          )
        );

      if (r.ok) {
        return await r.json();
      }
    } catch (e) {}

    return null;
  }

  function mergePost(dbPost, staticPost) {
    if (!staticPost) return dbPost;
    const out = {...dbPost};
    for (const k of ['category','title','description','content','slug','meta_title','meta_description','keywords']) {
      const a = out[k] && typeof out[k] === 'object' ? out[k] : {};
      const b = staticPost[k] && typeof staticPost[k] === 'object' ? staticPost[k] : {};
      out[k] = {...b, ...a};
      for (const [lang, value] of Object.entries(b)) { if (!out[k][lang] && value) out[k][lang] = value; }
    }
    if (!out.cover_file && staticPost.cover_file) out.cover_file = staticPost.cover_file;
    return out;
  }

  function postOut(x) {
    return {
      ...x,

      published:
        !!x.published,

      featured:
        !!x.featured,

      category:
        JSON.parse(
          x.category_json ||
            '{}'
        ),

      title:
        JSON.parse(
          x.title_json ||
            '{}'
        ),

      description:
        JSON.parse(
          x.description_json ||
            '{}'
        ),

      content:
        JSON.parse(
          x.content_json ||
            '{}'
        ),

      slug:
        JSON.parse(
          x.slug_json ||
            '{}'
        ),

      meta_title:
        JSON.parse(
          x.meta_title_json ||
            '{}'
        ),

      meta_description:
        JSON.parse(
          x.meta_description_json ||
            '{}'
        ),

      keywords:
        JSON.parse(
          x.keywords_json ||
            '{}'
        )
    };
  }

  async function onRequestGet({
    request,
    env
  }) {

    const u =
      new URL(request.url);

    const type =
      u.searchParams.get(
        'type'
      ) || '';

    if (!env.DB) {

      if (
        type ===
        'banners'
      ) {
        return json(
          await staticJSON(
            env,
            '/data/banners.json',
            request
          ) || []
        );
      }

      if (
        type ===
        'blogs'
      ) {
        return json(
          await staticJSON(
            env,
            '/data/blogs.json',
            request
          ) || []
        );
      }

      if (
        type ===
        'blog'
      ) {
        const a =
          await staticJSON(
            env,
            '/data/blogs.json',
            request
          ) || [];

        const x =
          a.find(
            x =>
              x.id ===
              u.searchParams.get(
                'slug'
              )
          );

        return json(
          x || null,
          x ? 200 : 404
        );
      }

      return json(
        {
          error:
            'Not found'
        },
        404
      );
    }

    if (
      type ===
      'banners'
    ) {

      const r =
        await env.DB
          .prepare(
            'SELECT * FROM banners WHERE enabled=1 ORDER BY position'
          )
          .all();

      return json(
        r.results.map(
          x => ({
            ...x,

            alt:
              JSON.parse(
                x.alt_json ||
                  '{}'
              ),

            title:
              JSON.parse(
                x.title_json ||
                  '{}'
              ),

            description:
              JSON.parse(
                x.description_json ||
                  '{}'
              ),

            button_text:
              JSON.parse(
                x.button_text_json ||
                  '{}'
              )
          })
        )
      );
    }

    if (
      type ===
      'blogs'
    ) {

      const r =
        await env.DB
          .prepare(
            `SELECT * FROM posts
             WHERE published=1
             ORDER BY featured DESC,
             COALESCE(published_at,created_at) DESC`
          )
          .all();

      const staticPosts = await staticJSON(env, '/data/blogs.json', request) || [];
      const staticMap = new Map(staticPosts.map(p => [String(p.id), p]));
      if (!r.results.length) return json(staticPosts);
      return json(r.results.map(x => mergePost(postOut(x), staticMap.get(String(x.id)))));
    }

    if (
      type ===
      'blog'
    ) {

      const slug =
        u.searchParams.get(
          'slug'
        ) || '';

      const r =
        await env.DB
          .prepare(
            'SELECT * FROM posts WHERE published=1'
          )
          .all();

      const x =
        r.results.find(
          p =>
            p.id === slug ||
            Object.values(
              JSON.parse(
                p.slug_json ||
                  '{}'
              )
            ).includes(
              slug
            )
        );

      const a = await staticJSON(env, '/data/blogs.json', request) || [];
      const y = a.find(p => p.id === slug || Object.values(p.slug || {}).includes(slug));
      if (!x) return json(y || {error:'Not found'}, y ? 200 : 404);
      return json(mergePost(postOut(x), y));
    }

    return json(
      {
        error:
          'Not found'
      },
      404
    );
  }

  return onRequestGet(
    context
  );
}


async function handleMedia(
  context
) {

  async function onRequestGet({
    params,
    env
  }) {

    if (!env.MEDIA) {
      return new Response(
        'R2 binding not configured',
        {
          status: 500
        }
      );
    }

    const key =
      Array.isArray(params.key)
        ? params.key.join('/')
        : params.key;

    const obj =
      await env.MEDIA.get(
        key
      );

    if (!obj) {
      return new Response(
        'Not found',
        {
          status: 404
        }
      );
    }

    const headers =
      new Headers();

    obj.writeHttpMetadata(
      headers
    );

    headers.set(
      'etag',
      obj.httpEtag
    );

    headers.set(
      'cache-control',
      'public, max-age=31536000, immutable'
    );

    return new Response(
      obj.body,
      {
        headers
      }
    );
  }

  return onRequestGet(
    context
  );
}


async function handleSitemap(
  context
) {

  async function onRequestGet({
    request,
    env
  }) {

    const base =
      new URL(
        request.url
      ).origin;

    let urls = [
      '/',
      '/hakkimizda',
      '/hizmetler',
      '/blog',
      '/iletisim',
  '/basinda-biz',
      '/blog/tupe-mide-ameliyati-nedir',
      '/blog/tupe-mide-kimler-icin-uygun',
      '/blog/tupe-mide-ameliyati-sonrasi',
      '/blog/tupe-mide-riskleri',
      '/blog/gastrik-bypass-nedir',
      '/blog/mide-balonu-nedir',
      '/blog/mide-botoksu-nedir',
      '/blog/gastrik-bypass-mi-tup-mide-mi',
      '/blog/obezite-cerrahisi-rehberi',
      '/blog/metabolik-cerrahi-tip2-diyabet',
      '/blog/metabolik-cerrahi-kimlere-uygulanir',
      '/blog/mide-balonu-mu-tup-mide-mi-hangisi-size-daha-uygun',
      '/blog/obezite-cerrahisi-sonrasi-spor-ve-hareket',
      '/blog/tup-mide-ameliyati-sonrasi-beslenme-nasil-olmali',
      '/saglik-turizmi',
      '/en/health-tourism',
      '/de/gesundheitstourismus',
      '/ar/alsiyaaha-alssihiyya',
      '/ru/medturizm',
      '/az/saglamliq-turizmi',
      '/sq/turizmi-shendetesor',
      '/nl/medisch-toerisme',
      '/es/turismo-sanitario'
    ];

    // Include the repository's static sitemap inventory as the canonical
    // source for the large set of static article pages. This file is fetched
    // through ASSETS so it bypasses this Worker and cannot recurse.
    try {
      const staticMapUrl = new URL('/sitemap.xml', request.url);
      const staticMap = await env.ASSETS.fetch(new Request(staticMapUrl, request));
      if (staticMap.ok) {
        const xml = await staticMap.text();
        const matches = [...xml.matchAll(/<loc>([^<]+)<\/loc>/gi)];
        for (const m of matches) {
          try {
            const u = new URL(m[1], base);
            if (u.origin !== base) continue;
            // Sitemap must contain canonical clean URLs, not legacy .html forms.
            u.pathname = u.pathname.replace(/\.html$/i, '') || '/';
            // Language redirect stubs are intentionally noindex and must not be
            // advertised in the sitemap.
            if (/^\/(?:tr|en|de|ar|ru|az|sq|nl|es)\/index$/i.test(u.pathname)) continue;
            if (/^\/(?:tr|en|de|ar|ru|az|sq|nl|es)\/(?:blog|hakkimizda|hizmetler|iletisim)$/i.test(u.pathname)) continue;
            urls.push(u.pathname + (u.search || ''));
          } catch (_) {}
        }
      }
    } catch (_) {}

    if (env.DB) {
      try {

        const r =
          await env.DB
            .prepare(
              'SELECT slug_json,id FROM posts WHERE published=1'
            )
            .all();

        for (
          const p of
            r.results
        ) {

          const s =
            JSON.parse(
              p.slug_json ||
                '{}'
            );

          for (
            const v of
              Object.values(s)
          ) {

            if (v) {
              urls.push(
                '/blog-post?slug=' +
                encodeURIComponent(v)
              );
            }
          }
        }

      } catch (e) {}
    }

    const body =
      '<?xml version="1.0" encoding="UTF-8"?>' +
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
      [...new Set(urls)]
        .map(
          x =>
            `<url><loc>${base}${x}</loc></url>`
        )
        .join('') +
      '</urlset>';

    return new Response(
      body,
      {
        headers: {
          'content-type':
            'application/xml; charset=utf-8',

          'cache-control':
            'public, max-age=3600'
        }
      }
    );
  }

  return onRequestGet(
    context
  );
}


/* =========================================================
   CLOUDFLARE PAGES ENTRY POINT (DÖNGÜ KORUMALI)
   ========================================================= */

async function getAdminUIHTML() {
  return `<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <title>Dr. Erol Vural - Admin Paneli</title>
    <style>
        body { font-family: sans-serif; background: #f4f6f9; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
        .login-box { background: white; padding: 30px; border-radius: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.1); width: 300px; }
        input { width: 100%; padding: 10px; margin: 10px 0; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box; }
        button { width: 100%; padding: 10px; background: #0051c3; color: white; border: none; border-radius: 4px; cursor: pointer; }
        button:hover { background: #003d99; }
    </style>
</head>
<body>
    <div class="login-box">
        <h2>Yönetim Paneli</h2>
        <form method="POST" action="/api/auth/login" onsubmit="handleLogin(event)">
            <input type="text" id="username" name="username" placeholder="Kullanıcı Adı" required>
            <input type="password" id="password" name="password" placeholder="Şifre" required>
            <button type="submit">Giriş Yap</button>
        </form>
    </div>
    <script>
      async function handleLogin(e) {
        e.preventDefault();
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: document.getElementById('username').value,
            password: document.getElementById('password').value
          })
        });
        if (res.ok) {
          window.location.reload();
        } else {
          const err = await res.json();
          alert(err.error || 'Giriş başarısız');
        }
      }
    </script>
</body>
</html>`;
}


/* =====================================================
   LEGACY URL MIGRATION
   - Old WordPress URLs are redirected before static assets.
   - Unknown legacy-looking URLs are never downloaded; they become real 404s.
   ===================================================== */
const LEGACY_REDIRECTS = Object.freeze({
  "/diyabet-ve-obezite": "/blog/metabolik-cerrahi-tip2-diyabet",
  "/diyabet-ve-obezite/": "/blog/metabolik-cerrahi-tip2-diyabet",
  "/10-maddede-obezite": "/blog/obezite-cerrahisi-rehberi",
  "/10-soruda-obezite": "/blog/obezite-cerrahisi-rehberi",
  "/5-soruda-seker-hastaligi-ameliyati": "/blog/metabolik-cerrahi-tip2-diyabet",
  "/6-aralik-2015-obezite-team-kahvalti-etkinligi": "/blog/obezite-cerrahisi-rehberi",
  "/aile-iliskilerinde-sorun-ve-obezite": "/blog/obezite-cerrahisi-rehberi",
  "/alkol-ve-diyet": "/alkol-diyet-kilo-yonetimi",
  "/ameliyat-sonrasi-olmamis-gibi-acikma-hissinin-sebepleri": "/bariatrik-cerrahi-sonrasi-aclik-ve-yeme-istegi",
  "/ameliyat-sonrasi-olusabilecek-yeme-bozukluklari": "/bariatrik-cerrahi-sonrasi-yeme-davranisi-ve-beslenme",
  "/arastirmacilar-tip-2-diyabet-yonetiminde-yuzde-15-kilo-kaybi-olmasi-gerektigini-soyluyor": "/tip-2-diyabette-kilo-kaybi-ve-metabolik-saglik",
  "/asiri-sismanlik-nedir": "/blog/obezite-cerrahisi-rehberi",
  "/bebeklerde-yeme-bozuklugu": "/bebeklerde-yeme-beslenme-sorunlari",
  "/beslenme-destegi-kimlere-verilir-nasil-uygulanir": "/beslenme-destegi-ve-klinik-beslenme",
  "/beslenmenin-seker-hastaligi-olusumu-uzerinde-etkileri-nelerdir": "/blog/metabolik-cerrahi-tip2-diyabet",
  "/bireylerde-kilo-alma-davranisi": "/kilo-alma-davranisi-ve-beslenme",
  "/by-pass-nedir": "/blog/gastrik-bypass-nedir",
  "/cocuklarda-obezite": "/blog/obezite-cerrahisi-rehberi",
  "/cocuklarda-obezite-2": "/blog/obezite-cerrahisi-rehberi",
  "/cocuklarda-obezite-nedenleri": "/blog/obezite-cerrahisi-rehberi",
  "/cocukluk-cagi-obezitesi-nedenleri": "/blog/obezite-cerrahisi-rehberi",
  "/cocukluk-cagi-obezitesi-nedir": "/blog/obezite-cerrahisi-rehberi",
  "/cocukluk-ve-ergen-obezitesi": "/blog/obezite-cerrahisi-rehberi",
  "/cok-fazla-seker-tuketmek-diyabet-yapar-mi": "/fazla-seker-tuketimi-ve-diyabet-riski",
  "/dikey-sleeve-gastrektomi-nedir": "/blog/tupe-mide-ameliyati-nedir",
  "/diyabet-depresyon-etkilesimi": "/diyabet-ve-depresyon",
  "/diyabet-kasintiya-sebep-olur-mu": "/diyabet-ve-kasinti",
  "/diyabet-neden-bas-agrisina-sebep-olur": "/diyabet-ve-bas-agrisi",
  "/diyabet-ve-yara-iyilesmesi-arasindaki-baglanti-nedir": "/diyabet-ve-yara-iyilesmesi",
  "/diyabeti-kontrol-etmek-icin-en-iyi-15-yiyecek": "/diyabet-beslenmesi-kan-sekeri-kontrolu",
  "/diyabetin-vucudunuz-uzerindeki-etkileri": "/diyabetin-vucut-uzerindeki-etkileri",
  "/diyabetli-cocuklar-icin-okulda-saglikli-beslenme": "/diyabetli-cocuklarda-okulda-beslenme",
  "/diyabetli-insanlar-kuru-uzum-yiyebilir-mi": "/diyabet-kuru-uzum-tuketimi",
  "/dt_team/opr-dr-erol-vural": "/hakkimizda",
  "/dunyada-obezite": "/blog/obezite-cerrahisi-rehberi",
  "/en/about-us": "/hakkimizda",
  "/en/dt_team/opr-dr-erol-vural": "/en/hakkimizda",
  "/fast-food-obeziteye-sebep-oluyor-mu": "/blog/obezite-cerrahisi-rehberi",
  "/fazla-kilo-ve-obezite-nedir": "/blog/obezite-cerrahisi-rehberi",
  "/fazla-kilolu-herkese-obezite-cerrahisi-uygulanabilir-mi": "/blog/obezite-cerrahisi-rehberi",
  "/fazla-tuz-insulin-direncini-artiriyor": "/fazla-tuz-insulin-direnci-ve-beslenme",
  "/gastrik-by-pass-operasyonu-sonrasi-beslenme": "/blog/gastrik-bypass-nedir",
  "/gastrik-by-pass-sonrasi-pure-kati-beslenme": "/gastrik-bypass-sonrasi-beslenme",
  "/gastrik-bypass": "/blog/gastrik-bypass-nedir",
  "/gastrik-bypass-ameliyati": "/blog/gastrik-bypass-nedir",
  "/gastrik-bypass-cerrahisi": "/blog/gastrik-bypass-nedir",
  "/gastrik-bypass-cerrahisinin-kilo-kaybinda-basarisi": "/blog/gastrik-bypass-nedir",
  "/gastrik-bypass-nedir-ve-ne-beklenmelidir": "/blog/gastrik-bypass-nedir",
  "/gastrik-sleeve-ameliyati-nedir": "/blog/tupe-mide-ameliyati-nedir",
  "/gastrik-sleeve-gastrektomi": "/blog/tupe-mide-ameliyati-nedir",
  "/gastrik-sleeve-ve-gastrik-bypass-ameliyatlari-nasil-farklilik-gosterir": "/tup-mide-ve-gastrik-bypass-farklari",
  "/gebelik-doneminde-obezite": "/blog/obezite-cerrahisi-rehberi",
  "/gebelikte-seker-hastaligi-ne-demek": "/blog/metabolik-cerrahi-tip2-diyabet",
  "/genlerde-obezite": "/blog/obezite-cerrahisi-rehberi",
  "/gizli-seker-hastaligi-tedavisi-icin-seker-hastaligi-ameliyati": "/blog/metabolik-cerrahi-tip2-diyabet",
  "/gizli-yeme-bagimliligi": "/gizli-yeme-ve-kontrolsuz-yeme-davranisi",
  "/gobek-bolgesindeki-yaglanma-artisi-obezite-ve-olum-riskini-arttiriyor": "/blog/obezite-cerrahisi-rehberi",
  "/hamilelik-ve-sonrasinda-obezite": "/blog/obezite-cerrahisi-rehberi",
  "/hasimato-hastaligi-hipotiroidi-ve-obezite": "/hashimoto-hipotiroidi-ve-obezite",
  "/hem-obezite-hemde-sosyal-fobi-mi": "/blog/obezite-cerrahisi-rehberi",
  "/her-kilolu-olan-kisiye-obezite-ameliyati-uygulanir-mi": "/blog/obezite-cerrahisi-rehberi",
  "/hiperlipidemi-ve-kolesterol-yuksekliginde-beslenme": "/kolesterol-yuksekligi-ve-beslenme",
  "/home": "/",
  "/insulin-direnci-icin-diyet-ipuclari": "/insulin-direnci-beslenme-ve-diyet",
  "/insulin-direnci-nedir": "/blog/metabolik-cerrahi-tip2-diyabet",
  "/insulin-direnci-tedavisinde-egzersizin-rolu": "/blog/metabolik-cerrahi-tip2-diyabet",
  "/insulin-nedir-neden-onemlidir": "/insulin-nedir-ve-ne-ise-yarar",
  "/insulin-seviyenizi-dusurmenin-14-yolu": "/insulin-seviyesi-ve-insulin-direnci",
  "/insulin-ve-insulin-direnci-guncel-kilavuz": "/blog/metabolik-cerrahi-tip2-diyabet",
  "/kalin-bagirsak-kanserinde-obezitenin-etkisi": "/blog/obezite-cerrahisi-rehberi",
  "/kalp-hastaligi-ve-diyabet-arasindaki-baglantiyi-anlamak": "/diyabet-ve-kalp-damar-hastaligi",
  "/kan-sekerini-kontrol-altina-alan-besinler": "/kan-sekeri-kontrolu-beslenme",
  "/kan-sekerini-yukselten-besinler-hangileridir": "/kan-sekerini-yukselten-besinler",
  "/ketojenik-diyet-tip-2-diyabet-icin-nasil-calisir": "/tip-2-diyabette-ketojenik-diyet",
  "/kilo-alma-ve-obezitenin-onde-gelen-10-nedeni": "/kilo-alma-ve-obezitenin-nedenleri",
  "/kilo-kaybi-ameliyatlari-ve-sonuclar": "/blog/obezite-cerrahisi-rehberi",
  "/kilo-kaybi-sonrasinda-yeme-ataklari-ve-sucluluk-duygusu": "/kilo-kaybi-sonrasi-yeme-ataklari-ve-duygusal-yeme",
  "/kilo-kaybinin-zayiflamanin-sosyal-ve-psikolojik-etkileri": "/kilo-kaybi-ve-psikolojik-sosyal-degisiklikler",
  "/kilo-verme-cerrahisi-turlerine-kilavuz": "/blog/obezite-cerrahisi-rehberi",
  "/kilo-vermem-durdu-fakat-spor-yapmaktan-da-nefret-ederim": "/blog/obezite-cerrahisi-sonrasi-spor-ve-hareket",
  "/kilo-vermenin-dezavantajlari-diyet-yapma-ihtimali-korkusu": "/blog/obezite-cerrahisi-rehberi",
  "/laparoskopik-obezite-ameliyati": "/blog/obezite-cerrahisi-rehberi",
  "/laparoskopik-obezite-cerrahisi-nasil-uygulanir": "/blog/obezite-cerrahisi-rehberi",
  "/metabolik-cerrahi-kimlere-uygulanir-nasil-yapilir": "/blog/metabolik-cerrahi-tip2-diyabet",
  "/metabolik-cerrahi-nedir-kimlere-uygulanir-nasil-yapilir": "/blog/metabolik-cerrahi-tip2-diyabet",
  "/mide-balonu": "/blog/mide-balonu-nedir",
  "/mide-balonu-2": "/blog/mide-balonu-nedir",
  "/mide-balonu-3": "/blog/mide-balonu-nedir",
  "/mide-balonu-ameliyati": "/blog/mide-balonu-nedir",
  "/mide-balonu-avantajlari": "/blog/mide-balonu-nedir",
  "/mide-balonu-avantajlari-ve-turleri-nelerdir": "/blog/mide-balonu-nedir",
  "/mide-balonu-kimlere-uygulanir": "/blog/mide-balonu-nedir",
  "/mide-balonu-kimlere-uygulanir-2": "/blog/mide-balonu-nedir",
  "/mide-balonu-nasil-uygulanir": "/blog/mide-balonu-nedir",
  "/mide-balonu-nedir-kimlere-uygulanir": "/blog/mide-balonu-nedir",
  "/mide-balonu-operasyonundan-sonra-beslenme-sekli": "/blog/mide-balonu-nedir",
  "/mide-botoksu": "/blog/mide-botoksu-nedir",
  "/mide-botoksu-kilo-vermeyi-saglar-mi": "/blog/mide-botoksu-nedir",
  "/mide-botoksu-nedir-kimlere-uygulanir": "/blog/mide-botoksu-nedir",
  "/mide-kucultme-ameliyati": "/blog/tupe-mide-ameliyati-nedir",
  "/mide-kucultme-ameliyati-ile-obeziteye-son": "/blog/tupe-mide-ameliyati-nedir",
  "/mide-kucultme-ameliyati-kimlere-uygulanir": "/blog/tupe-mide-kimler-icin-uygun",
  "/mide-kucultme-ameliyati-nedir-nasil-yapilir": "/blog/tupe-mide-ameliyati-nedir",
  "/mide-kucultme-ameliyati-riskli-mi": "/blog/tupe-mide-riskleri",
  "/mide-kucultme-ameliyati-sonrasi": "/blog/tupe-mide-ameliyati-sonrasi",
  "/mide-kucultme-ameliyati-sonrasi-depresyon": "/obezite-cerrahisi-sonrasi-depresyon-ve-psikolojik-destek",
  "/mide-kucultme-ameliyatinin-sonuclari": "/blog/tupe-mide-ameliyati-nedir",
  "/mide-kucultme-nedir": "/blog/tupe-mide-ameliyati-nedir",
  "/mini-gastrik-bypass-ameliyati-hakkinda-merak-edilenler": "/blog/gastrik-bypass-nedir",
  "/morbid-obezite-hakkinda-bilmeniz-gerekenler": "/blog/obezite-cerrahisi-rehberi",
  "/morbid-obezite-ile-iliskili-hastaliklar": "/blog/obezite-cerrahisi-rehberi",
  "/morbid-obezite-nedir-kimlere-morbid-obez-denir": "/morbid-obezite-nedir",
  "/morbid-obezite-tanisi-ve-hastaligin-degerlendirilme-yontemleri": "/blog/obezite-cerrahisi-rehberi",
  "/morbid-obezitede-tup-mide-ameliyatinin-etkisi": "/blog/tupe-mide-ameliyati-nedir",
  "/morbid-obeziteye-neden-olan-sebepler": "/blog/obezite-cerrahisi-rehberi",
  "/ne-yiyebilirim-gestasyonel-diyabet": "/gebelikte-diyabet-beslenmesi",
  "/neden-tup-mide-sleeve-gastrektomi-ameliyati": "/blog/tupe-mide-ameliyati-nedir",
  "/obezite": "/blog/obezite-cerrahisi-rehberi",
  "/obezite-akupunktur-ile-tedavi-edilir-mi": "/blog/obezite-cerrahisi-rehberi",
  "/obezite-ameliyati-": "/blog/obezite-cerrahisi-rehberi",
  "/obezite-ameliyati-olanlar": "/blog/obezite-cerrahisi-rehberi",
  "/obezite-ameliyati-sonrasi-alkol-kullanimi": "/blog/obezite-cerrahisi-rehberi",
  "/obezite-ameliyati-sonrasi-basari-saglanmasinin-adimlari": "/obezite-ameliyati-sonrasi-uzun-donem-takip",
  "/obezite-ameliyati-sonrasi-diyet-yapmama-gerek-var-mi": "/blog/obezite-cerrahisi-rehberi",
  "/obezite-ameliyati-sonrasi-gebelik": "/blog/obezite-cerrahisi-rehberi",
  "/obezite-ameliyati-sonrasi-nelere-dikkat-etmeli": "/blog/obezite-cerrahisi-rehberi",
  "/obezite-ameliyati-sonrasi-takip-nedir-ve-nasil-yapilir": "/blog/obezite-cerrahisi-rehberi",
  "/obezite-ameliyati-sonrasi-verilen-kilolar-geri-alinir-mi": "/blog/obezite-cerrahisi-rehberi",
  "/obezite-ameliyati-sonrasinda-olusan-capraz-bagimlilik": "/blog/obezite-cerrahisi-rehberi",
  "/obezite-ameliyatindan-once-endoskopi-ve-kolonoskopi": "/blog/obezite-cerrahisi-rehberi",
  "/obezite-ameliyatindan-sonra-gebelik": "/blog/obezite-cerrahisi-rehberi",
  "/obezite-ameliyatindan-sonra-vitamin-ihtiyaci": "/obezite-cerrahisi-sonrasi-vitamin-mineral-takibi",
  "/obezite-ameliyatindan-sonra-zayif-bedeni-kabullenme": "/blog/obezite-cerrahisi-rehberi",
  "/obezite-ameliyatlari": "/blog/obezite-cerrahisi-rehberi",
  "/obezite-ameliyatlari-olumcul-mudur": "/blog/obezite-cerrahisi-rehberi",
  "/obezite-ameliyatlari-ve-sigara-aliskanligi": "/blog/obezite-cerrahisi-rehberi",
  "/obezite-ayiplanmaya-ayiplanma-ise-ofkeye-sebep-olmaktadir": "/blog/obezite-cerrahisi-rehberi",
  "/obezite-belirtileri-nelerdir": "/blog/obezite-cerrahisi-rehberi",
  "/obezite-cerrahi-sonrasi-uyulmasi-gereken-oneriler": "/blog/obezite-cerrahisi-rehberi",
  "/obezite-cerrahi-ve-sonrasi-hakkinda-sikca-sorulan-sorular": "/blog/obezite-cerrahisi-rehberi",
  "/obezite-cerrahisi-ameliyati-oncesi-beslenme": "/blog/obezite-cerrahisi-rehberi",
  "/obezite-cerrahisi-hakkinda-sorular-cevaplar": "/blog/obezite-cerrahisi-rehberi",
  "/obezite-cerrahisi-hastalarinda-su-tuketimi-ve-suyun-onemi": "/blog/obezite-cerrahisi-rehberi",
  "/obezite-cerrahisi-nedir": "/blog/obezite-cerrahisi-rehberi",
  "/obezite-cerrahisi-nedir-3": "/blog/obezite-cerrahisi-rehberi",
  "/obezite-cerrahisi-sonrasi-beslenme-nasil-olmalidir": "/blog/obezite-cerrahisi-rehberi",
  "/obezite-cerrahisi-sonrasi-beslenme-nasil-olmalidir-2": "/blog/obezite-cerrahisi-rehberi",
  "/obezite-cerrahisi-sonrasi-gebe-kalma": "/blog/obezite-cerrahisi-rehberi",
  "/obezite-cerrahisi-sonrasi-kabizlik-ve-alinacak-onemler": "/obezite-cerrahisi-sonrasi-kabizlik",
  "/obezite-cerrahisi-sonrasi-kafein-tuketimi": "/blog/obezite-cerrahisi-rehberi",
  "/obezite-cerrahisi-sonrasi-ne-kadar-zayiflayacagim": "/blog/obezite-cerrahisi-rehberi",
  "/obezite-cerrahisi-sonrasi-tatlandiricilarin-hayatinizda-ki-yeri": "/blog/obezite-cerrahisi-rehberi",
  "/obezite-cerrahisi-sonrasi-vitamin-mineral-ihtiyaci": "/blog/obezite-cerrahisi-rehberi",
  "/obezite-cerrahisi-sonrasi-yasanabilecek-sorunlar": "/obezite-cerrahisi-sonrasi-takip-ve-olasi-sorunlar",
  "/obezite-cerrahisi-sonrasinda-neden-psikolojik-destek-gerekir": "/blog/obezite-cerrahisi-rehberi",
  "/obezite-cerrahisi-ve-karbonhidratlarin-secimi": "/blog/obezite-cerrahisi-rehberi",
  "/obezite-cerrahisinde-multidisipliner-yaklasim": "/blog/obezite-cerrahisi-rehberi",
  "/obezite-cerrahisinde-riskler-ve-yan-etkiler": "/blog/obezite-cerrahisi-rehberi",
  "/obezite-cerrahisinde-yontem-nasil-secilir": "/blog/obezite-cerrahisi-rehberi",
  "/obezite-cerrahisinden-sonra-tekrar-kilo-alinir-mi": "/blog/obezite-cerrahisi-rehberi",
  "/obezite-cerrahisinden-sonra-vitamin-ihtiyaci": "/blog/obezite-cerrahisi-rehberi",
  "/obezite-cerrahisinin-psikolojik-etkileri": "/blog/obezite-cerrahisi-rehberi",
  "/obezite-genetik-mi": "/blog/obezite-cerrahisi-rehberi",
  "/obezite-gercekleri": "/blog/obezite-cerrahisi-rehberi",
  "/obezite-gorulme-sikligi-nedir": "/blog/obezite-cerrahisi-rehberi",
  "/obezite-hakkinda-her-sey": "/blog/obezite-cerrahisi-rehberi",
  "/obezite-hastaligi-nasil-anlasilir": "/blog/obezite-cerrahisi-rehberi",
  "/obezite-hastaligi-ve-benlik-saygisi-arasindaki-iliski": "/blog/obezite-cerrahisi-rehberi",
  "/obezite-hastaligi-ve-beraberinde-seyreden-psikolojik-sorunlar": "/blog/obezite-cerrahisi-rehberi",
  "/obezite-hastaligi-ve-sosyal-destek": "/blog/obezite-cerrahisi-rehberi",
  "/obezite-hastaligina-bagli-ozguven-problemleri": "/blog/obezite-cerrahisi-rehberi",
  "/obezite-hastaligina-sebep-olan-yeme-bozukluklari-1": "/blog/obezite-cerrahisi-rehberi",
  "/obezite-hastaligina-yol-acan-davranislar": "/blog/obezite-cerrahisi-rehberi",
  "/obezite-hesaplama": "/obezite-hesaplama-bmi-vucut-kitle-indeksi",
  "/obezite-hipertansiyon-riskinizi-nasil-artirabilir-ve-bu-konuda-neler-yapabilirsiniz": "/obezite-ve-hipertansiyon",
  "/obezite-icin-belirti-ve-bulgular": "/blog/obezite-cerrahisi-rehberi",
  "/obezite-icin-etkili-yontemler-nelerdir": "/blog/obezite-cerrahisi-rehberi",
  "/obezite-icin-kilo-yonetimi-programinda-dikkate-alinmasi-gereken-8-sey": "/blog/obezite-cerrahisi-rehberi",
  "/obezite-icin-risk-faktorleri": "/blog/obezite-cerrahisi-rehberi",
  "/obezite-ilacla-tedavi-edilebilir-mi": "/blog/obezite-cerrahisi-rehberi",
  "/obezite-ile-ilgili-dogru-bilinen-yanlislar-nelerdir": "/blog/obezite-cerrahisi-rehberi",
  "/obezite-ile-iliskili-sik-gorulen-saglik-sorunlari": "/blog/obezite-cerrahisi-rehberi",
  "/obezite-ile-mucadelede-cerrahi-tedavi-yontemlerinin-etkileri": "/blog/obezite-cerrahisi-rehberi",
  "/obezite-ile-mucadelede-davranis-terapisi": "/blog/obezite-cerrahisi-rehberi",
  "/obezite-ile-mucadelede-ilac-tedavisi": "/obezite-tedavisinde-ilaclar",
  "/obezite-ile-tedavide-nasil-bir-yol-izlenir": "/blog/obezite-cerrahisi-rehberi",
  "/obezite-meme-kanserini-tetikliyor": "/blog/obezite-cerrahisi-rehberi",
  "/obezite-nasil-hesaplanir": "/blog/obezite-cerrahisi-rehberi",
  "/obezite-nasil-onlenir-obezite-nedir": "/blog/obezite-cerrahisi-rehberi",
  "/obezite-nasil-test-edilir": "/blog/obezite-cerrahisi-rehberi",
  "/obezite-ne-zaman-genetiktir": "/blog/obezite-cerrahisi-rehberi",
  "/obezite-neden-ani-olum-riskini-artirir": "/blog/obezite-cerrahisi-rehberi",
  "/obezite-neden-bir-hastalik-olarak-kabul-edilir-edilmez": "/blog/obezite-cerrahisi-rehberi",
  "/obezite-neden-cinsel-fonksiyon-bozuklugu-yapar": "/blog/obezite-cerrahisi-rehberi",
  "/obezite-nedenleri-nelerdir": "/blog/obezite-cerrahisi-rehberi",
  "/obezite-nedir-2": "/blog/obezite-cerrahisi-rehberi",
  "/obezite-nedir-neden-olur": "/blog/obezite-cerrahisi-rehberi",
  "/obezite-nedir-nedenleri-nedir": "/blog/obezite-cerrahisi-rehberi",
  "/obezite-nedir-obez-kimlere-denir": "/blog/obezite-cerrahisi-rehberi",
  "/obezite-nedir-ve-tedavisi-nasil-yapilir": "/blog/obezite-cerrahisi-rehberi",
  "/obezite-oldurur-mu": "/blog/obezite-cerrahisi-rehberi",
  "/obezite-rahatsizligi-beynin-dusmani": "/blog/obezite-cerrahisi-rehberi",
  "/obezite-rehabilitasyonu": "/blog/obezite-cerrahisi-rehberi",
  "/obezite-riskine-karsi-dogru-beslenme": "/blog/obezite-cerrahisi-rehberi",
  "/obezite-sadece-dis-gorunum-sorunu-degildir": "/blog/obezite-cerrahisi-rehberi",
  "/obezite-sebepleri": "/blog/obezite-cerrahisi-rehberi",
  "/obezite-tanisi-ve-tedavisi": "/blog/obezite-cerrahisi-rehberi",
  "/obezite-tedavi-edilmeli-midir": "/blog/obezite-cerrahisi-rehberi",
  "/obezite-tedavi-yollari": "/blog/obezite-cerrahisi-rehberi",
  "/obezite-tedavisi-ve-ilaclar": "/blog/obezite-cerrahisi-rehberi",
  "/obezite-tedavisinde-mide-botoksu": "/blog/mide-botoksu-nedir",
  "/obezite-teshisi-nasil-koyulur": "/blog/obezite-cerrahisi-rehberi",
  "/obezite-ve-alzheimer-hastaligi": "/blog/obezite-cerrahisi-rehberi",
  "/obezite-ve-cinsellik-iliskisi": "/obezite-ve-cinsel-saglik",
  "/obezite-ve-d-vitamini-arasindaki-iliski": "/blog/obezite-cerrahisi-rehberi",
  "/obezite-ve-demir-eksikligi-anemisi": "/blog/obezite-cerrahisi-rehberi",
  "/obezite-ve-depresyon": "/blog/obezite-cerrahisi-rehberi",
  "/obezite-ve-depresyon-iliskili-midir-ve-9-diger-sss": "/blog/obezite-cerrahisi-rehberi",
  "/obezite-ve-depresyon-riski": "/blog/obezite-cerrahisi-rehberi",
  "/obezite-ve-gebelik": "/blog/obezite-cerrahisi-rehberi",
  "/obezite-ve-genetik": "/blog/obezite-cerrahisi-rehberi",
  "/obezite-ve-hipertansiyon": "/blog/obezite-cerrahisi-rehberi",
  "/obezite-ve-insulin-direnci": "/blog/metabolik-cerrahi-tip2-diyabet",
  "/obezite-ve-kanser-arasindaki-iliskideki-biyolojik-mekanizmalar-nelerdir": "/blog/obezite-cerrahisi-rehberi",
  "/obezite-ve-kardiyovaskuler-hastaliklar": "/blog/obezite-cerrahisi-rehberi",
  "/obezite-ve-kilolu-olmanin-farki-nedir": "/blog/obezite-cerrahisi-rehberi",
  "/obezite-ve-metabolik-sendrom": "/blog/obezite-cerrahisi-rehberi",
  "/obezite-ve-saglik": "/blog/obezite-cerrahisi-rehberi",
  "/obezite-virusu-diye-bir-sey-var-mi": "/blog/obezite-cerrahisi-rehberi",
  "/obezite-vucudu-nasil-etkiler": "/blog/obezite-cerrahisi-rehberi",
  "/obezite/ameliyat-riskleri-nelerdir": "/blog/obezite-cerrahisi-rehberi",
  "/obezite/ameliyat-sonrasi-kontroller": "/blog/obezite-cerrahisi-rehberi",
  "/obezite/ameliyattan-hemen-sonraki-donem": "/blog/obezite-cerrahisi-rehberi",
  "/obezite/mide-balonu": "/blog/mide-balonu-nedir",
  "/obezite/obezite-cerrahisi-nedir": "/blog/obezite-cerrahisi-rehberi",
  "/obezite/obezite-hesaplama": "/obezite-hesaplama-bmi-vucut-kitle-indeksi",
  "/obezite/obezite-nasil-olculur": "/blog/obezite-cerrahisi-rehberi",
  "/obezite/tup-mide-ameliyati": "/blog/tupe-mide-ameliyati-nedir",
  "/obezitede-tibbi-beslenme-tedavisi-nedir": "/blog/obezite-cerrahisi-rehberi",
  "/obezitenin-cesitli-kanserlerle-olan-iliskisi": "/blog/obezite-cerrahisi-rehberi",
  "/obezitenin-nedeni-olay-beyinde-mi": "/blog/obezite-cerrahisi-rehberi",
  "/obezitenin-nedenleri-ve-sonuclari": "/blog/obezite-cerrahisi-rehberi",
  "/obezitenin-psikolojik-nedenleri": "/obezitenin-psikolojik-etkenleri-ve-yeme-davranisi",
  "/obezitenin-vucudunuza-ve-sagliginiza-etkisi": "/blog/obezite-cerrahisi-rehberi",
  "/obezitenin-yol-actigi-kanser-turleri-nelerdir": "/blog/obezite-cerrahisi-rehberi",
  "/obezitenin-yol-actigi-saglik-problemleri-nelerdir": "/blog/obezite-cerrahisi-rehberi",
  "/obeziteye-neden-olan-etmenler": "/blog/obezite-cerrahisi-rehberi",
  "/obeziteye-yol-acan-dusunce-hatalari": "/blog/obezite-cerrahisi-rehberi",
  "/obeziteyle-ilgili-sorunlar-nelerdir": "/blog/obezite-cerrahisi-rehberi",
  "/polikistik-over-ve-obezite": "/blog/obezite-cerrahisi-rehberi",
  "/project-category/obezite-cerrahi": "/blog/obezite-cerrahisi-rehberi",
  "/roux-y-gastrik-bypass": "/blog/gastrik-bypass-nedir",
  "/saglikli-obezite-diye-bir-sey-var-mi": "/blog/obezite-cerrahisi-rehberi",
  "/seker-hastalari-uzun-mu-yasiyor": "/diyabet-yasam-suresi-ve-komplikasyonlar",
  "/seker-hastalarinda-dis-problemleri-gorulmesi": "/diyabet-ve-agiz-dis-sagligi",
  "/seker-hastaligi-ameliyat-ile-tedavi-edilir-mi": "/blog/metabolik-cerrahi-tip2-diyabet",
  "/seker-hastaligi-ameliyati": "/blog/metabolik-cerrahi-tip2-diyabet",
  "/seker-hastaligi-ameliyati-2": "/blog/metabolik-cerrahi-tip2-diyabet",
  "/seker-hastaligi-ameliyati-avantajlari": "/blog/metabolik-cerrahi-tip2-diyabet",
  "/seker-hastaligi-ameliyati-basarili-olur-mu": "/blog/metabolik-cerrahi-tip2-diyabet",
  "/seker-hastaligi-ameliyati-ile-hormonal-etkiler": "/blog/metabolik-cerrahi-tip2-diyabet",
  "/seker-hastaligi-ameliyati-ile-obezite-tedavi-edilebilir-mi": "/blog/metabolik-cerrahi-tip2-diyabet",
  "/seker-hastaligi-ameliyati-kilo-kontrolu-saglar-mi": "/blog/metabolik-cerrahi-tip2-diyabet",
  "/seker-hastaligi-ameliyati-kimlere-uygulanir": "/blog/metabolik-cerrahi-tip2-diyabet",
  "/seker-hastaligi-ameliyati-kimlere-uygulanir-2": "/blog/metabolik-cerrahi-tip2-diyabet",
  "/seker-hastaligi-ameliyati-maliyetli-bir-tedavi-midir": "/blog/metabolik-cerrahi-tip2-diyabet",
  "/seker-hastaligi-ameliyati-nasil-yapilir": "/blog/metabolik-cerrahi-tip2-diyabet",
  "/seker-hastaligi-ameliyati-ne-kazandirir": "/blog/metabolik-cerrahi-tip2-diyabet",
  "/seker-hastaligi-ameliyati-nedir": "/blog/metabolik-cerrahi-tip2-diyabet",
  "/seker-hastaligi-ameliyati-oncesi-ve-sonrasi": "/blog/metabolik-cerrahi-tip2-diyabet",
  "/seker-hastaligi-ameliyati-riskleri": "/metabolik-cerrahi-riskleri-ve-hasta-degerlendirmesi",
  "/seker-hastaligi-ameliyati-sonrasi": "/blog/metabolik-cerrahi-tip2-diyabet",
  "/seker-hastaligi-ameliyati-sonrasi-2": "/blog/metabolik-cerrahi-tip2-diyabet",
  "/seker-hastaligi-ameliyati-sonrasi-ortaya-cikan-degisiklikler-nelerdir": "/blog/metabolik-cerrahi-tip2-diyabet",
  "/seker-hastaligi-ameliyati-tedavisi": "/blog/metabolik-cerrahi-tip2-diyabet",
  "/seker-hastaligi-ameliyati-ve-metabolik-cerrahi": "/blog/metabolik-cerrahi-tip2-diyabet",
  "/seker-hastaligi-ameliyatinda-basari": "/blog/metabolik-cerrahi-tip2-diyabet",
  "/seker-hastaligi-ameliyatinda-basari-orani": "/blog/metabolik-cerrahi-tip2-diyabet",
  "/seker-hastaligi-ameliyatinda-basari-orani-nedir": "/blog/metabolik-cerrahi-tip2-diyabet",
  "/seker-hastaligi-ameliyatinin-sonuclari-nelerdir": "/blog/metabolik-cerrahi-tip2-diyabet",
  "/seker-hastaligi-belirtileri-ve-nedenleri": "/blog/metabolik-cerrahi-tip2-diyabet",
  "/seker-hastaligi-depresyonu-tetikliyor": "/blog/metabolik-cerrahi-tip2-diyabet",
  "/seker-hastaligi-genetik-mi": "/diyabet-genetik-mi",
  "/seker-hastaligi-hakkinda-bilinmesi-gerekenler": "/diyabet-hakkinda-bilinmesi-gerekenler",
  "/seker-hastaligi-hakkinda-dogru-bilinen-yanlislar": "/blog/metabolik-cerrahi-tip2-diyabet",
  "/seker-hastaligi-hakkinda-onemli-bilgiler-nelerdir": "/blog/metabolik-cerrahi-tip2-diyabet",
  "/seker-hastaligi-hakkinda-sik-sorulan-sorular": "/blog/metabolik-cerrahi-tip2-diyabet",
  "/seker-hastaligi-icin-bitki-onerileri": "/diyabette-bitkisel-urunler-ve-beslenme",
  "/seker-hastaligi-ilacla-onlenebilir-mi": "/blog/metabolik-cerrahi-tip2-diyabet",
  "/seker-hastaligi-ile-mucadelede-cerrahi-yontemlerin-basarisi": "/blog/metabolik-cerrahi-tip2-diyabet",
  "/seker-hastaligi-ilgili-yanlis-algilar": "/diyabet-hakkinda-dogru-bilinen-yanlislar",
  "/seker-hastaligi-kaynakli-bobrek-hastaliklari": "/blog/metabolik-cerrahi-tip2-diyabet",
  "/seker-hastaligi-kontrol-edilebilir-mi": "/blog/metabolik-cerrahi-tip2-diyabet",
  "/seker-hastaligi-neden-olur": "/seker-hastaligi-nedenleri",
  "/seker-hastaligi-nedenleri": "/blog/metabolik-cerrahi-tip2-diyabet",
  "/seker-hastaligi-oncesi-tahliller": "/blog/metabolik-cerrahi-tip2-diyabet",
  "/seker-hastaligi-onlenebilir-mi": "/blog/metabolik-cerrahi-tip2-diyabet",
  "/seker-hastaligi-riskini-azaltmak-icin-3-adim": "/tip-2-diyabet-riskini-azaltma",
  "/seker-hastaligi-tedavisi": "/blog/metabolik-cerrahi-tip2-diyabet",
  "/seker-hastaligi-tedavisinde-egzersiz-ve-cerrahi-mudaheleler": "/diyabet-tedavisi-egzersiz-ve-metabolik-cerrahi",
  "/seker-hastaligi-tipleri": "/diyabet-tipleri",
  "/seker-hastaligi-ve-depresyon": "/diyabet-ve-depresyon",
  "/seker-hastaligina-bagli-sisen-ayaklari-tedavi-etmek-icin-10-ipucu": "/diyabete-bagli-ayak-sisligi",
  "/seker-hastaliginda-ameliyat-tedavisi": "/blog/metabolik-cerrahi-tip2-diyabet",
  "/seker-hastaliginda-cinsiyet-ve-kisiye-ozel-tedavi": "/blog/metabolik-cerrahi-tip2-diyabet",
  "/seker-hastaliginda-gorulen-komplikasyonlar": "/diyabet-komplikasyonlari",
  "/seker-hastaliginda-ortaya-cikabilecek-rahatsizliklar": "/blog/metabolik-cerrahi-tip2-diyabet",
  "/seker-hastaliginda-teknolojik-yontem": "/blog/metabolik-cerrahi-tip2-diyabet",
  "/seker-hastaligindan-korunmanin-yolu-nedir": "/tip-2-diyabetten-korunma-ve-risk-azaltma",
  "/seker-hastaliginin-bobrek-uzerindeki-etkisi": "/blog/metabolik-cerrahi-tip2-diyabet",
  "/seker-hastaliginin-cinsellik-uzerine-etkileri-var-mi": "/blog/metabolik-cerrahi-tip2-diyabet",
  "/seker-hastaliginin-cinsellik-uzerine-etkileri-var-mi-2": "/diyabet-ve-cinsel-saglik",
  "/seker-hastaliginin-gebelik-doneminde-bebege-etkisi": "/gebelikte-diyabet-ve-bebek-sagligi",
  "/seker-hastaliginin-olusturdugu-bedensel-ve-ruhsal-rahatsizliklar": "/diyabetin-bedensel-ve-ruhsal-etkileri",
  "/seker-hastaliginin-zarar-verdigi-organlar-hangileridir": "/diyabetin-organlara-etkileri-ve-komplikasyonlari",
  "/seker-hastasi-icin-iyi-ve-kotu-beslenme-turleri": "/diyabette-saglikli-beslenme",
  "/seker-hastasi-oldugunuza-isaret-eden-bazi-belirtiler": "/diyabet-belirtileri",
  "/siddetli-morbid-obezite-icin-ameliyat-secenekleri": "/blog/obezite-cerrahisi-rehberi",
  "/sismanlik-genetik-mi-yasam-tarzi-mi": "/obezite-genetik-mi-yasam-tarzi-mi",
  "/sismanlik-seker-hastaligina-neden-oluyor": "/blog/metabolik-cerrahi-tip2-diyabet",
  "/sismanliktan-zayiflik-yolunda-yasananlar-adim-adim-2": "/blog/obezite-cerrahisi-rehberi",
  "/sismanliktan-zayiflik-yolunda-yasananlar-adim-adim-6": "/blog/obezite-cerrahisi-rehberi",
  "/sleeve-gastrektomi": "/blog/tupe-mide-ameliyati-nedir",
  "/sleeve-gastrektomi-komplikasyonlari": "/tup-mide-ameliyati-olasi-riskler-ve-komplikasyonlar",
  "/sleeve-gastrektomi-nedir": "/blog/tupe-mide-ameliyati-nedir",
  "/sleeve-gastrektominin-tarihcesi": "/blog/tupe-mide-ameliyati-nedir",
  "/stresli-donemlerde-kilo-verme-mucadelesi": "/stres-ve-kilo-yonetimi",
  "/tibbi-efsaneler-obezite-ile-ilgili-5-yaygin-efsane": "/blog/obezite-cerrahisi-rehberi",
  "/tip-1-diyabet-hastalari-icin-yeni-tedavi-yontemi": "/tip-1-diyabet-tedavi-yaklasimlari",
  "/tip-1-diyabet-hastalari-neden-seker-hastaligi-ameliyati-olamaz": "/tip-1-diyabet-ve-metabolik-cerrahi",
  "/tip-1-diyabet-hastalarina-seker-hastaligi-ameliyati-uygulanabilir-mi": "/tip-1-diyabet-ve-metabolik-cerrahi",
  "/tip-1-ve-tip-2-diyabet-ikisinin-farki-nedir": "/tip-1-ve-tip-2-diyabet-farklari",
  "/tip-2-diyabet-tersine-cevrilebilir-mi": "/tip-2-diyabet-remisyonu-ve-metabolik-saglik",
  "/tip-2-diyabet-tip-1-diyabete-donusebilir-mi": "/tip-1-ve-tip-2-diyabet-ayrimi",
  "/tip-2-diyabet-ve-cinsel-saglik": "/tip-2-diyabet-cinsel-saglik",
  "/tip-2-diyabeti-onlemenin-13-yolu": "/tip-2-diyabet-riskini-azaltma",
  "/tip-2-diyabette-mesane-ve-bobrekler": "/tip-2-diyabet-bobrek-ve-idrar-yollari-sagligi",
  "/tip-2-seker-hastaligi-hakkinda": "/blog/metabolik-cerrahi-tip2-diyabet",
  "/transit-bipartisyon": "/blog/metabolik-cerrahi-tip2-diyabet",
  "/transit-bipartisyon-2": "/blog/metabolik-cerrahi-tip2-diyabet",
  "/transit-bipartisyon-ameliyati-fiyati": "/blog/metabolik-cerrahi-tip2-diyabet",
  "/transit-bipartisyon-ameliyati-sonrasi": "/blog/metabolik-cerrahi-tip2-diyabet",
  "/transit-bipartisyon-ne-ise-yarar": "/blog/metabolik-cerrahi-tip2-diyabet",
  "/transit-bipartisyon-nedir-kimlere-uygulanir": "/blog/metabolik-cerrahi-tip2-diyabet",
  "/transit-bipartisyon-nedir-ve-hangi-durumlarda-uygulanir": "/blog/metabolik-cerrahi-tip2-diyabet",
  "/transit-bipartisyon-yontemi-ile-ameliyat": "/blog/metabolik-cerrahi-tip2-diyabet",
  "/tukettigimiz-besinler-ve-ruhsal-dengemiz-uzerindeki-etkileri-1": "/beslenme-ve-ruh-sagligi",
  "/tup-mide": "/blog/tupe-mide-ameliyati-nedir",
  "/tup-mide-ameliyati": "/blog/tupe-mide-ameliyati-nedir",
  "/tup-mide-ameliyati-hakkinda-merak-edilenler": "/blog/tupe-mide-ameliyati-nedir",
  "/tup-mide-ameliyati-maliyetli-bir-ameliyat-mi": "/blog/tupe-mide-ameliyati-nedir",
  "/tup-mide-ameliyati-maliyetli-bir-ameliyat-midir": "/blog/tupe-mide-ameliyati-nedir",
  "/tup-mide-ameliyati-nasil-yapilir": "/blog/tupe-mide-ameliyati-nedir",
  "/tup-mide-ameliyati-neden-yapilir": "/blog/tupe-mide-ameliyati-nedir",
  "/tup-mide-ameliyati-olanlar": "/blog/tupe-mide-ameliyati-nedir",
  "/tup-mide-ameliyati-oncesi": "/blog/tupe-mide-ameliyati-nedir",
  "/tup-mide-ameliyati-riskleri": "/blog/tupe-mide-riskleri",
  "/tup-mide-ameliyati-sonrasi": "/blog/tupe-mide-ameliyati-sonrasi",
  "/tup-mide-ameliyati-sonrasi-beslenme": "/blog/tupe-mide-ameliyati-sonrasi",
  "/tup-mide-ameliyati-sonrasi-beslenme-2": "/blog/tupe-mide-ameliyati-sonrasi",
  "/tup-mide-ameliyati-sonrasi-beslenme-konusunda-dikkat-edilmesi-gerekenler": "/blog/tupe-mide-ameliyati-sonrasi",
  "/tup-mide-ameliyati-sonrasi-gebelik": "/blog/tupe-mide-ameliyati-sonrasi",
  "/tup-mide-ameliyati-sonrasi-yasam": "/blog/tupe-mide-ameliyati-sonrasi",
  "/tup-mide-ameliyati-sonrasinda-gunluk-yasama-donme-suresi": "/tup-mide-ameliyati-sonrasi-gunluk-yasama-donus",
  "/tup-mide-ameliyati-ve-ameliyattan-sonraki-surecler": "/tup-mide-ameliyati-sonrasi-surec",
  "/tup-mide-ameliyati-ve-riskleri": "/blog/tupe-mide-riskleri",
  "/tup-mide-ameliyatinda-basari-orani-nedir": "/blog/tupe-mide-ameliyati-nedir",
  "/tup-mide-ameliyatinda-iyilesme-donemi": "/tup-mide-ameliyati-sonrasi-iyilesme",
  "/tup-mide-ameliyatinda-pilor-kasinin-durumu": "/blog/tupe-mide-ameliyati-nedir",
  "/tup-mide-ameliyatinda-yas-ve-kilo-siniri-var-midir": "/tup-mide-ameliyatinda-yas-ve-kilo-siniri",
  "/tup-mide-ameliyatindan-sonra-safra-tasi": "/blog/tupe-mide-ameliyati-nedir",
  "/tup-mide-ameliyatinin-avantajlari-nelerdir": "/blog/tupe-mide-ameliyati-nedir",
  "/tup-mide-ameliyatinin-uygulama-sekilleri": "/blog/tupe-mide-ameliyati-nedir",
  "/tup-mide-ameliyatiyla-ilgili-bilmeniz-gerekenler": "/blog/tupe-mide-ameliyati-nedir",
  "/tup-mide-nedir": "/blog/tupe-mide-ameliyati-nedir",
  "/tup-mide-operasyonlarinin-hormonlar": "/blog/tupe-mide-ameliyati-nedir",
  "/tup-mide-sonrasi-diyette-neler-yenir-ve-nelerden-kacinilir": "/tup-mide-ameliyati-sonrasi-beslenme",
  "/turkiye-ve-dunyada-obezitenin-durumu": "/blog/obezite-cerrahisi-rehberi",
  "/turkiyede-obezite-artisi-hizla-devam-ediyor": "/blog/obezite-cerrahisi-rehberi",
  "/universite-ogrencilerinde-obezite-gelisimi": "/blog/obezite-cerrahisi-rehberi",
  "/uzun-sureli-kilo-kaybi-icin-5-ipucu": "/blog/obezite-cerrahisi-rehberi",
  "/vucut-yag-dagilimi-ve-obezitenin-siniflandirilmasi": "/vucut-yag-dagilimi-ve-obezite",
  "/yeme-problemi-olan-yakininiza-nasil-davranmaniz-gerekir": "/yeme-problemleri-ve-aile-yaklasimi",
  "/yeni-seker-hastaligi-ameliyati": "/blog/metabolik-cerrahi-tip2-diyabet",
  "/yetiskinler-cocuklar-ve-gencler-icin-bmi-olcumu": "/cocuklarda-ve-genclerde-vucut-kitle-indeksi-bmi",
  "/yuksek-kan-sekeri-hiperglisemi-nasil-hissettirir": "/yuksek-kan-sekeri-hiperglisemi-belirtileri",
  "/zayiflama-ameliyati-olarak-bilinen-ameliyatlar-kilo-kaybi-cerrahisi": "/blog/obezite-cerrahisi-rehberi",
  "/zayiflama-ameliyati-olarak-bilinen-obezite-cerrahisi": "/blog/obezite-cerrahisi-rehberi",
  "/zayiflama-ameliyatlarinin-riskleri-nelerdir": "/blog/obezite-cerrahisi-rehberi",
  "/zayiflama-psikolojisinde-aslinda-siz-siz-degilsiniz": "/blog/obezite-cerrahisi-rehberi",
  "/zayiflama-surecinde-egzersizin-onemi": "/blog/obezite-cerrahisi-sonrasi-spor-ve-hareket",
  "/diyabet/insulin-direnci-nedir": "/blog/metabolik-cerrahi-tip2-diyabet",
  "/bariatrik-cerrahi-sonrasi-dumping-sendromu-ve-beslenme-onerileri": "/blog/obezite-cerrahisi-sonrasi-spor-ve-hareket",
  "/diyabet-tip-1-ve-tip-2-diyabetin-karsilastirilmasi": "/blog/metabolik-cerrahi-tip2-diyabet",
  "/tip-1-diyabet-nedir": "/blog/metabolik-cerrahi-tip2-diyabet",
  "/diyabet-risk-faktorleri-nelerdir": "/blog/metabolik-cerrahi-tip2-diyabet",
  "/seker-diyabete-neden-olur-mu": "/blog/metabolik-cerrahi-tip2-diyabet",
  "/bariatrik-cerrahi": "/blog/obezite-cerrahisi-rehberi",
  "/bariatrik-cerrahi-nedir": "/blog/obezite-cerrahisi-rehberi",
  "/bariatrik-cerrahi-hakkinda": "/blog/obezite-cerrahisi-rehberi",
  "/bariatrik-cerrahi-sonrasi-diyet-esaslari": "/blog/tup-mide-ameliyati-sonrasi-beslenme-nasil-olmali",
  "/bariatrik-cerrahi-ve-sonrasi-egzersiz-ve-fitness": "/blog/obezite-cerrahisi-sonrasi-spor-ve-hareket",
  "/bariatrik-cerrahi-oncesi-ve-sonrasi-psikolojik-degerlendirme": "/blog/obezite-cerrahisi-rehberi",
  "/obezite-nedir-nasil-mucadele-edilir": "/blog/obezite-cerrahisi-rehberi",
  "/turkiyede-obezite": "/blog/obezite-cerrahisi-rehberi",
  "/mide-botoksu-kimler-icin-uygun-degildir": "/blog/mide-botoksu-nedir",});

const LEGACY_REDIRECT_PATTERNS = [
  ['/kategori/mide-ameliyati/', '/hizmetler'],
  ['/kategori/tup-mide/tup-mide-ameliyati-sonrasi/', '/blog/tupe-mide-ameliyati-sonrasi'],
  ['/kategori/transit-bipartisyon/', '/blog/metabolik-cerrahi-tip2-diyabet'],
  ['/kategori/mide-botoksu/', '/blog/mide-botoksu-nedir']
];

const KNOWN_EXTENSIONLESS_ROUTES = new Set([
  "/",
  "/404",
  "/alkol-diyet-kilo-yonetimi",
  "/alkol-ve-beslenme",
  "/ar",
  "/ar/alsiyaaha-alssihiyya",
  "/ar/blog",
  "/ar/hakkimizda",
  "/ar/hizmetler",
  "/ar/iletisim",
  "/ar/shukran",
  "/az",
  "/az/blog",
  "/az/hakkimizda",
  "/az/hizmetler",
  "/az/iletisim",
  "/az/saglamliq-turizmi",
  "/az/tesekkur",
  "/bariatrik-cerrahi-sonrasi-aclik-ve-yeme-istegi",
  "/bariatrik-cerrahi-sonrasi-yeme-davranisi-ve-beslenme",
  "/bebeklerde-yeme-beslenme-sorunlari",
  "/bedankt",
  "/beslenme-destegi-ve-klinik-beslenme",
  "/beslenme-ve-ruh-sagligi",
  "/blagodarnost",
  "/blog",
  "/blog/obezite-cerrahisi-rehberi",
  "/blog/metabolik-cerrahi-tip2-diyabet",
  "/blog/tupe-mide-ameliyati-nedir",
  "/blog/mide-balonu-nedir",
  "/blog/gastrik-bypass-nedir",
  "/blog/tupe-mide-ameliyati-sonrasi",
  "/blog/mide-botoksu-nedir",
  "/blog/tupe-mide-riskleri",
  "/blog/obezite-cerrahisi-sonrasi-spor-ve-hareket",
  "/blog/tupe-mide-kimler-icin-uygun",
  "/blog/tup-mide-ameliyati-sonrasi-beslenme-nasil-olmali",
  "/blog/metabolik-cerrahi-kimlere-uygulanir",
  "/blog/gastrik-bypass-mi-tup-mide-mi",
  "/blog/mide-balonu-mu-tup-mide-mi-hangisi-size-daha-uygun",
  "/blog-post",
  "/blog/gastrik-bypass-mi-tup-mide-mi",
  "/blog/gastrik-bypass-nedir",
  "/blog/metabolik-cerrahi-kimlere-uygulanir",
  "/blog/metabolik-cerrahi-tip2-diyabet",
  "/blog/mide-balonu-mu-tup-mide-mi-hangisi-size-daha-uygun",
  "/blog/mide-balonu-nedir",
  "/blog/mide-botoksu-nedir",
  "/blog/obezite-cerrahisi-rehberi",
  "/blog/obezite-cerrahisi-sonrasi-spor-ve-hareket",
  "/blog/tup-mide-ameliyati-sonrasi-beslenme-nasil-olmali",
  "/blog/tupe-mide-ameliyati-nedir",
  "/blog/tupe-mide-ameliyati-sonrasi",
  "/blog/tupe-mide-kimler-icin-uygun",
  "/blog/tupe-mide-riskleri",
  "/cocuklarda-ve-genclerde-vucut-kitle-indeksi-bmi",
  "/cocuklarda-yeme-davranislari",
  "/danke",
  "/de",
  "/de/blog",
  "/de/danke",
  "/de/gesundheitstourismus",
  "/de/hakkimizda",
  "/de/hizmetler",
  "/de/iletisim",
  "/diyabet-belirtileri",
  "/diyabet-beslenmesi-kan-sekeri-kontrolu",
  "/diyabet-genetik-mi",
  "/diyabet-hakkinda-bilinmesi-gerekenler",
  "/diyabet-hakkinda-dogru-bilinen-yanlislar",
  "/diyabet-komplikasyonlari",
  "/diyabet-kuru-uzum-tuketimi",
  "/diyabet-tedavisi-egzersiz-ve-metabolik-cerrahi",
  "/diyabet-tipleri",
  "/diyabet-ve-agiz-dis-sagligi",
  "/diyabet-ve-ayak-sagligi",
  "/diyabet-ve-bas-agrisi",
  "/diyabet-ve-cinsel-saglik",
  "/diyabet-ve-depresyon",
  "/diyabet-ve-kalp-damar-hastaligi",
  "/diyabet-ve-kasinti",
  "/diyabet-ve-yara-iyilesmesi",
  "/diyabet-yasam-suresi-ve-komplikasyonlar",
  "/diyabete-bagli-ayak-sisligi",
  "/diyabetin-bedensel-ve-ruhsal-etkileri",
  "/diyabetin-organlara-etkileri-ve-komplikasyonlari",
  "/diyabetin-vucut-uzerindeki-etkileri",
  "/diyabetli-cocuklarda-okulda-beslenme",
  "/diyabette-bitkisel-urunler-ve-beslenme",
  "/diyabette-kan-sekeri-degerleri",
  "/diyabette-saglikli-beslenme",
  "/en",
  "/en/blog",
  "/en/hakkimizda",
  "/en/health-tourism",
  "/en/hizmetler",
  "/en/iletisim",
  "/en/thank-you",
  "/es",
  "/es/blog",
  "/es/hakkimizda",
  "/es/hizmetler",
  "/es/iletisim",
  "/es/turismo-sanitario",
  "/faleminderit",
  "/fazla-seker-tuketimi-ve-diyabet-riski",
  "/fazla-tuz-insulin-direnci-ve-beslenme",
  "/gastrik-bypass-sonrasi-beslenme",
  "/gebelikte-diyabet-beslenmesi",
  "/gebelikte-diyabet-ve-bebek-sagligi",
  "/gizli-yeme-ve-kontrolsuz-yeme-davranisi",
  "/hakkimizda",
  "/hashimoto-hipotiroidi-ve-obezite",
  "/hizmetler",
  "/iletisim",
  "/insulin-direnci",
  "/insulin-direnci-beslenme-ve-diyet",
  "/insulin-nedir-ve-ne-ise-yarar",
  "/insulin-seviyesi-ve-insulin-direnci",
  "/kabizlik-ve-beslenme",
  "/kan-sekeri-kontrolu-beslenme",
  "/kan-sekerini-yukselten-besinler",
  "/kilo-alma-davranisi-ve-beslenme",
  "/kilo-alma-ve-obezitenin-nedenleri",
  "/kilo-kaybi-sonrasi-yeme-ataklari-ve-duygusal-yeme",
  "/kilo-kaybi-ve-psikolojik-sosyal-degisiklikler",
  "/kolesterol-yuksekligi-ve-beslenme",
  "/laktoz-intoleransi-ve-beslenme",
  "/menopoz-doneminde-beslenme",
  "/metabolik-cerrahi-riskleri-ve-hasta-degerlendirmesi",
  "/mide-botoksu-kimler-icin-uygun-degildir",
  "/morbid-obezite-nedir",
  "/nl",
  "/nl/bedankt",
  "/nl/blog",
  "/nl/hakkimizda",
  "/nl/hizmetler",
  "/nl/iletisim",
  "/nl/medisch-toerisme",
  "/obezite-ameliyati-sonrasi-uzun-donem-takip",
  "/obezite-cerrahisi-sonrasi-depresyon-ve-psikolojik-destek",
  "/obezite-cerrahisi-sonrasi-kabizlik",
  "/obezite-cerrahisi-sonrasi-takip-ve-olasi-sorunlar",
  "/obezite-cerrahisi-sonrasi-vitamin-mineral-takibi",
  "/obezite-genetik-mi-yasam-tarzi-mi",
  "/obezite-hesaplama-bmi-vucut-kitle-indeksi",
  "/obezite-tedavisinde-ilaclar",
  "/obezite-ve-cinsel-saglik",
  "/obezite-ve-hipertansiyon",
  "/obezitenin-psikolojik-etkenleri-ve-yeme-davranisi",
  "/ru",
  "/ru/blagodarnost",
  "/ru/blog",
  "/ru/hakkimizda",
  "/ru/hizmetler",
  "/ru/iletisim",
  "/ru/medturizm",
  "/saglik-turizmi",
  "/seker-hastaligi-nedenleri",
  "/shukran",
  "/sq",
  "/sq/blog",
  "/sq/faleminderit",
  "/sq/hakkimizda",
  "/sq/hizmetler",
  "/sq/iletisim",
  "/sq/turizmi-shendetesor",
  "/stres-ve-kilo-yonetimi",
  "/tesekkur",
  "/tesekkurler",
  "/thank-you",
  "/tip-1-diyabet-tedavi-yaklasimlari",
  "/tip-1-diyabet-ve-metabolik-cerrahi",
  "/tip-1-ve-tip-2-diyabet-ayrimi",
  "/tip-1-ve-tip-2-diyabet-farklari",
  "/tip-2-diyabet-bobrek-ve-idrar-yollari-sagligi",
  "/tip-2-diyabet-cinsel-saglik",
  "/tip-2-diyabet-remisyonu-ve-metabolik-saglik",
  "/tip-2-diyabet-riskini-azaltma",
  "/tip-2-diyabette-ketojenik-diyet",
  "/tip-2-diyabette-kilo-kaybi-ve-metabolik-saglik",
  "/tip-2-diyabetten-korunma-ve-risk-azaltma",
  "/tiroid-hastaliklarinda-beslenme",
  "/tr",
  "/tr/blog",
  "/tr/hakkimizda",
  "/tr/hizmetler",
  "/tr/iletisim",
  "/tup-mide-ameliyati-olasi-riskler-ve-komplikasyonlar",
  "/tup-mide-ameliyati-sonrasi-beslenme",
  "/tup-mide-ameliyati-sonrasi-gunluk-yasama-donus",
  "/tup-mide-ameliyati-sonrasi-hamilelik",
  "/tup-mide-ameliyati-sonrasi-iyilesme",
  "/tup-mide-ameliyati-sonrasi-surec",
  "/tup-mide-ameliyatinda-yas-ve-kilo-siniri",
  "/tup-mide-ve-gastrik-bypass-farklari",
  "/vucut-yag-dagilimi-ve-obezite",
  "/yeme-problemleri-ve-aile-yaklasimi",
  "/yuksek-kan-sekeri-hiperglisemi-belirtileri",
]);

function looksLikeLegacyWordPressPath(pathname) {
  return (
    pathname.startsWith('/kategori/') ||
    pathname.startsWith('/category/') ||
    pathname.startsWith('/tag/') ||
    pathname.startsWith('/author/') ||
    /^\/20\d{2}\/\d{2}(\/\d{2})?(\/.*)?$/.test(pathname) ||
    (pathname.endsWith('/') && pathname.split('/').filter(Boolean).length >= 1 && !pathname.startsWith('/international-assets/'))
  );
}

function isExtensionless(pathname) {
  const last = pathname.split('/').filter(Boolean).pop() || '';
  return last !== '' && !last.includes('.');
}

function legacyDestination(pathname) {
  const clean = pathname.replace(/\/+$/, '') || '/';
  if (LEGACY_REDIRECTS[clean]) return LEGACY_REDIRECTS[clean];
  for (const [prefix, destination] of LEGACY_REDIRECT_PATTERNS) {
    if (pathname === prefix || pathname.startsWith(prefix)) return destination;
  }
  return null;
}

function redirectResponse(request, destination) {
  const target = new URL(destination, request.url);
  const source = new URL(request.url);
  if (!target.search && source.search) target.search = source.search;
  return new Response(null, {
    status: 301,
    headers: {
      'Location': target.toString(),
      'Cache-Control': 'public, max-age=31536000',
      'X-Content-Type-Options': 'nosniff'
    }
  });
}

// Google Search Console coverage cleanup (2026-09-24).
const GSC_LEGACY_301 = Object.freeze({
  '/en/blog': '/blog',
  '/en/diabetes': '/hizmetler',
  '/en/obesity': '/hizmetler',
});

const GSC_LEGACY_410 = new Set([
  '/test-post-created-47', '/test-post-created-38', '/test-post-created-64',
  '/test-post-created-65', '/test-post-created-66', '/test-post-created-60',
  '/test-post-created-58', '/test-post-created-62', '/test-post-created-63',
  '/test-post-created-59', '/test-post-created-56', '/test-post-created-52',
  '/test-post-created-50', '/test-post-created-49', '/test-post-created-45',
  '/test-post-created-43', '/test-post-created-48', '/test-post-created-44',
  '/test-post-created-40', '/test-post-created-37', '/test-post-created-36',
  '/test-post-created-35', '/test-post-created-61', '/test-post-created-53',
  '/test-post-created-55', '/test-post-created-46', '/test-post-created-29',
  '/test-post-created-9', '/test-post-created-31', '/test-post-created-3',
  '/test-post-created-21', '/test-post-created-67', '/test-post-created-6',
  '/test-post-created-7', '/test-post-created-57', '/test-post-created-54',
  '/test-post-created-51', '/test-post-created-5', '/test-post-created-33',
  '/test-post-created-30', '/test-post-created-32', '/test-post-created-25',
  '/test-post-created-41', '/test-post-created-42', '/test-post-created-24',
  '/test-post-created-70', '/test-post-created-16', '/test-post-created-34',
  '/test-post-created-20', '/test-post-created-19', '/test-post-created-15',
  '/test-post-created-18', '/test-post-created-17', '/test-post-created-2',
  '/test-post-created-10', '/test-post-created-13', '/test-post-created-4',
  '/test-post-created-12', '/test-post-created-28', '/test-post-created-11',
  '/test-post-created-26', '/test-post-created-22', '/test-post-created-8',
  '/test-post-created-23', '/test-post-created', '/test-post-created-27',
  '/test-post-created-39', '/test-post-created-69', '/test-post-created-14',
  '/coronavirus-disease-2019-21', '/coronavirus-disease-2019-23',
  '/coronavirus-disease-2019-24', '/coronavirus-disease-2019-19',
  '/coronavirus-disease-2019-20', '/coronavirus-disease-2019-16',
  '/coronavirus-disease-2019-12', '/coronavirus-disease-2019-14',
  '/coronavirus-disease-2019-17', '/coronavirus-disease-2019-18',
  '/coronavirus-disease-2019-7', '/coronavirus-disease-2019-8',
  '/coronavirus-disease-2019-13', '/coronavirus-disease-2019-3',
  '/coronavirus-disease-2019-15', '/coronavirus-disease-2019-6',
  '/coronavirus-disease-2019-10',
  '/lizaro-casino-oppdag-de-mest-spennende-spillene-og-funksjonene-i-2026-2',
  '/les-tendances-du-jeu-de-demain-vers-une-evolution-2',
  '/unlocking-the-best-casino-bonuses-in-2026-maximize-your-rewards-today-2',
  '/unlock-the-best-rewards-with-the-davinci-s-gold-casino-mobile-app-in-2026-2',
  '/innovative-technology-transforming-the-gaming-2',
  '/transform-your-gaming-with-pin-up-bonuses-and-promotions-for-2023-pin-up-is-more-than-just-a-nostalg-2',
  '/the-best-online-casino-apps-of-2026-enjoy-seamless-gaming-on-the-go-2',
  '/explore-best-casino-options-play-id-ultimate-guide-3',
  '/explore-best-casino-options-play-id-ultimate-guide-2',
  '/chicken-road-pros-y-contras-que-debes-conocer-antes-de-jugar-el-mundo-de-los-videojuegos-de-apuestas-4',
  '/gelecein-oyun-dunyas-cevrimici-casinolarn-evrimi-2',
  '/gelecein-oyun-dunyas-cevrimici-casinolarn-evrimi-3',
  '/chicken-road-pros-y-contras-que-debes-conocer-antes-de-jugar-el-mundo-de-los-videojuegos-de-apuestas-2',
  '/aviator-game-mobile-download-app-play-instantly',
  '/page/43',
  '/page/17',
]);

const GLOBAL_HTML_CSS = `
/* DREROLVURAL.COM — global QA/UI layer */
html{scroll-behavior:smooth;overflow-x:hidden}
body{max-width:100%;overflow-x:hidden}
*,*:before,*:after{box-sizing:border-box}
img,video,svg{max-width:100%;height:auto}
a,button,input,textarea,select{touch-action:manipulation}
button,a{ -webkit-tap-highlight-color:transparent }
header{max-width:100vw}
main,section,article,.container,.content,.page-container{max-width:100%;overflow-wrap:anywhere}
h1,h2,h3,h4,h5,h6{overflow-wrap:anywhere}
table{max-width:100%;border-collapse:collapse}
.article-content,.content,main{overflow-wrap:anywhere}
.article-content img,.content img,article img{display:block;margin-left:auto;margin-right:auto}
.article-content table,.content table{display:block;overflow-x:auto;-webkit-overflow-scrolling:touch}
input,textarea,select{font-size:16px;max-width:100%}
button,.btn-primary,.read,.back,[role="button"]{min-height:44px}
.mobile-menu-btn{min-width:44px;min-height:44px;display:none;align-items:center;justify-content:center}
nav{z-index:1002}
.lang-dropdown{z-index:1003}
.lang-content{z-index:1004;max-width:calc(100vw - 20px)}
.whatsapp-floating-btn,.whatsapp{z-index:1100}
footer{overflow:hidden}
@media(max-width:992px){
  header{padding-left:max(14px,4vw)!important;padding-right:max(14px,4vw)!important}
  .mobile-menu-btn{display:flex!important}
  nav{max-width:100vw}
  .contact-container,.services-wrapper,.about-container,.featured-card{width:100%;max-width:100%}
}
@media(max-width:700px){
  .hero,.inner-hero{padding-left:20px!important;padding-right:20px!important}
  .hero h1,.inner-hero h1{font-size:clamp(28px,8vw,40px)!important}
  .article-content{font-size:16px!important}
  .whatsapp-floating-btn,.whatsapp{right:16px!important;bottom:16px!important;width:54px!important;height:54px!important;font-size:29px!important}
  .service-row,.service-row.reverse{width:100%;margin-left:0!important;margin-right:0!important}
  .contact-container{padding:22px!important}
}
`;

const GLOBAL_HTML_JS = `
(function(){
  'use strict';
  function init(){
    /* Prevent accidental double-submit handlers on the contact form. */
    const form=document.getElementById('contactForm');
    if(form){
      form.setAttribute('data-global-qa','1');
      /* Contact page previously had both an inline FormSubmit handler and
         the shared site.js handler. Capture-phase handling makes the submit
         deterministic and prevents duplicate messages. */
      if((form.getAttribute('action')||'').includes('formsubmit.co') && !form.dataset.qaSubmitBound){
        form.dataset.qaSubmitBound='1';
        form.addEventListener('submit',async function(e){
          e.preventDefault();
          e.stopImmediatePropagation();
          const btn=form.querySelector('button[type="submit"]');
          const success=document.getElementById('successMessage');
          if(btn){btn.disabled=true;btn.dataset.qaText=btn.textContent;btn.textContent='Gönderiliyor…';}
          try{
            const res=await fetch(form.action,{method:'POST',body:new FormData(form),headers:{Accept:'application/json'}});
            if(!res.ok) throw new Error('Form submit failed');
            form.reset();form.style.display='none';if(success)success.style.display='block';
          }catch(err){
            console.error(err);
            alert('Bir hata oluştu, lütfen tekrar deneyin.');
          }finally{
            if(btn){btn.disabled=false;btn.textContent=btn.dataset.qaText||'Gönder';}
          }
        },true);
      }
    }

    /* Mobile navigation works even if an older inline handler is missing. */
    const nav=document.getElementById('navMenu');
    const menuBtn=document.querySelector('.mobile-menu-btn');
    if(nav && menuBtn && !menuBtn.dataset.qaBound){
      menuBtn.dataset.qaBound='1';
      menuBtn.addEventListener('click',function(){
        nav.classList.toggle('active');
        menuBtn.setAttribute('aria-expanded',nav.classList.contains('active')?'true':'false');
      });
    }

    /* Keyboard-accessible language dropdown. */
    document.querySelectorAll('.lang-btn,.langicon,.lang').forEach(function(btn){
      if(btn.dataset.qaLangBound) return;
      btn.dataset.qaLangBound='1';
      btn.setAttribute('role','button');
      btn.setAttribute('tabindex','0');
      btn.addEventListener('keydown',function(e){
        if(e.key==='Enter'||e.key===' '){e.preventDefault();if(window.toggleLangMenu)window.toggleLangMenu(e);}
      });
    });

    /* External links should not retain opener access. */
    document.querySelectorAll('a[target="_blank"]').forEach(function(a){
      const rel=(a.getAttribute('rel')||'').split(/\\s+/).filter(Boolean);
      if(rel.indexOf('noopener')<0) rel.push('noopener');
      if(rel.indexOf('noreferrer')<0) rel.push('noreferrer');
      a.setAttribute('rel',rel.join(' '));
    });

    /* Close mobile menu after navigation. */
    document.querySelectorAll('#navMenu a').forEach(function(a){
      a.addEventListener('click',function(){ if(nav) nav.classList.remove('active'); });
    });

    /* Images: avoid layout overflow and expose missing-alt issues. */
    document.querySelectorAll('img').forEach(function(img){
      if(!img.hasAttribute('alt')) img.setAttribute('alt','Doç. Dr. Erol Vural');
      img.addEventListener('error',function(){img.classList.add('qa-image-error');});
    });
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
`;

function enhanceHtmlResponse(response){
  const ct=(response.headers.get('content-type')||'').toLowerCase();
  if(!ct.includes('text/html')) return response;
  const headers=new Headers(response.headers);
  headers.delete('content-length');
  return new HTMLRewriter()
    .on('head',{element(e){
      e.append(`<style id="drerolvural-global-qa">${GLOBAL_HTML_CSS}</style>`,{html:true});
    }})
    .on('body',{element(e){
      e.append(`<script id="drerolvural-global-qa-js">${GLOBAL_HTML_JS}</script>`,{html:true});
    }})
    .transform(new Response(response.body,{status:response.status,statusText:response.statusText,headers}));
}

function legacyNotFoundResponse(request, reason = 'legacy-url-not-found') {
  const h = new Headers({
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store, max-age=0',
    'X-Robots-Tag': 'noindex, nofollow',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'X-Legacy-URL-Status': reason
  });
  return new Response(null, { status: 404, headers: h });
}

export default {

  async fetch(
    request,
    env,
    ctx
  ) {

    const url =
      new URL(request.url);

    // Normalize trailing slashes before every legacy/GSC route decision.
    const cleanPathname = url.pathname.replace(/\/+$/, '') || '/';

    // Handle known legacy WordPress URLs before asset routing.
    const legacyTarget = legacyDestination(cleanPathname);
    if (legacyTarget) {
      return redirectResponse(request, legacyTarget);
    }

    // GSC coverage cleanup: explicit redirects and permanent removals.
    const gscTarget = GSC_LEGACY_301[cleanPathname];
    if (gscTarget) {
      return redirectResponse(request, gscTarget);
    }
    if (GSC_LEGACY_410.has(cleanPathname)) {
      return legacyNotFoundResponse(request, 'gsc-legacy-410');
    }

    // Unknown extensionless paths are resolved only if a real matching `.html`
    // asset exists. The route table remains useful for special/legacy paths, while
    // the asset fallback below keeps future clean article URLs from becoming 404s.


    /* ADMIN UI PANEL RROTA */

    if (
      url.pathname === '/erol_admin' ||
      url.pathname === '/erol_admin/'
    ) {
      // Gerçek yönetim arayüzünü ASSETS'ten servis et. Eski gömülü login ekranı
      // kaldırıldı; aksi halde başarılı oturumdan sonra panel hiç açılmıyordu.
      const adminUrl = new URL('/erol_admin/index.html', request.url);
      return env.ASSETS.fetch(new Request(adminUrl, request));
    }


    /* SITEMAP */

    if (
      url.pathname ===
      '/sitemap.xml'
    ) {
      return handleSitemap({
        request,
        env,
        ctx
      });
    }


    /* PUBLIC API */

    if (
      url.pathname ===
        '/api/public' ||
      url.pathname.startsWith(
        '/api/public/'
      )
    ) {
      return handlePublic({
        request,
        env,
        ctx
      });
    }


    /* ADMIN API */

    if (
      url.pathname ===
        '/api' ||
      url.pathname.startsWith(
        '/api/'
      )
    ) {
      return handleAdmin({
        request,
        env,
        ctx
      });
    }


    /* R2 MEDIA */

    if (
      url.pathname.startsWith(
        '/media/'
      )
    ) {

      const key =
        url.pathname
          .slice(
            '/media/'.length
          )
          .split('/')
          .filter(Boolean);

      return handleMedia({
        request,
        env,
        ctx,
        params: {
          key
        }
      });
    }


    /* =====================================================
       R2 OVERRIDE — international-assets
       ===================================================== */
    if (url.pathname.startsWith('/international-assets/') && env.MEDIA) {
      const key=url.pathname.slice(1); const obj=await env.MEDIA.get(key);
      if (obj) { const headers=new Headers(); obj.writeHttpMetadata(headers); headers.set('etag',obj.httpEtag); headers.set('cache-control','public, max-age=31536000, immutable'); return new Response(obj.body,{headers}); }
    }

    /* =====================================================
       STATIC / EXTENSIONLESS HTML ROUTING
       =====================================================
       IMPORTANT: Do not fetch `/article.html` here. Cloudflare Pages
       canonicalizes HTML files to their extensionless pretty URL, so doing
       ASSETS.fetch(`/article.html`) from the Worker can produce a redirect
       back to `/article`, which re-enters this Worker and can create a
       redirect loop. Let the Pages asset layer resolve `/article` to the
       matching root-level `article.html` directly.
    */

    /* =====================================================
       CLEAN BLOG ARTICLE ROUTING
       /blog/<slug> is the public canonical form for the site's
       featured/dynamic articles. Internally render blog-post.html
       with the slug while keeping the clean browser URL.
       ===================================================== */
    if (url.pathname.startsWith('/blog/') && url.pathname !== '/blog/') {
      const slug = url.pathname.slice('/blog/'.length).replace(/\/$/, '');
      if (slug && !slug.includes('.')) {
        const articleUrl = new URL('/blog-post.html', request.url);
        articleUrl.searchParams.set('slug', slug);
        if (url.searchParams.has('lang')) {
          articleUrl.searchParams.set('lang', url.searchParams.get('lang') || '');
        }
        const articleResponse = await env.ASSETS.fetch(new Request(articleUrl, request));
        const articleType = (articleResponse.headers.get('content-type') || '').toLowerCase();
        if (articleResponse.ok && articleType.includes('text/html')) {
          response = articleResponse;
        } else {
          const notFoundUrl = new URL('/404.html', request.url);
          const notFound = await env.ASSETS.fetch(new Request(notFoundUrl, request));
          const h = new Headers(notFound.headers);
          h.set('X-Robots-Tag', 'noindex, nofollow');
          h.set('Cache-Control', 'no-store, max-age=0');
          h.delete('Content-Disposition');
          return enhanceHtmlResponse(new Response(notFound.body, { status: 404, headers: h }));
        }
      }
    }

    /* =====================================================
       NORMAL SITE DOSYASI
       ===================================================== */

    let response =
      await env.ASSETS.fetch(
        request
      );

    // Robust clean-URL fallback: if the asset layer cannot resolve an
    // extensionless article and returns 404/octet-stream, try the real
    // root-level HTML asset without changing the public canonical URL.
    const responseType = (response.headers.get('content-type') || '').toLowerCase();
    const responseDisposition = (response.headers.get('content-disposition') || '').toLowerCase();
    const extensionless = !cleanPathname.split('/').pop()?.includes('.');
    if (
      extensionless &&
      cleanPathname !== '/' &&
      (response.status === 404 ||
       responseType.includes('application/octet-stream') ||
       responseDisposition.includes('attachment'))
    ) {
      const htmlAssetUrl = new URL(cleanPathname + '.html', request.url);
      const htmlResponse = await env.ASSETS.fetch(new Request(htmlAssetUrl, request));
      const htmlType = (htmlResponse.headers.get('content-type') || '').toLowerCase();
      if (htmlResponse.ok && htmlType.includes('text/html')) {
        response = htmlResponse;
      }
    }


    /* =====================================================
       404 FALLBACK + PUBLIC SECURITY HEADERS
       ===================================================== */

    const outHeaders = new Headers(response.headers);
    outHeaders.set('X-Content-Type-Options', 'nosniff');
    outHeaders.set('X-Frame-Options', 'SAMEORIGIN');
    outHeaders.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    outHeaders.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    outHeaders.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

    // Some missing extensionless legacy paths can otherwise be exposed as
    // downloadable octet-streams by the asset layer. Never allow that.
    const contentType = (response.headers.get('content-type') || '').toLowerCase();
    const contentDisposition = (response.headers.get('content-disposition') || '').toLowerCase();
    const isExtensionlessPath = !url.pathname.split('/').pop()?.includes('.');
    const looksLikeAccidentalDownload =
      contentDisposition.includes('attachment') ||
      contentType.includes('application/octet-stream') ||
      contentType.includes('binary/octet-stream') ||
      contentType.includes('application/force-download') ||
      contentType.includes('application/download') ||
      (isExtensionlessPath && contentType === 'application/octet-stream');

    if (response.status === 404 || looksLikeAccidentalDownload) {
      const notFoundUrl = new URL('/404.html', request.url);
      const notFound = await env.ASSETS.fetch(new Request(notFoundUrl, request));
      const h = new Headers(notFound.headers);
      h.set('X-Content-Type-Options', 'nosniff');
      h.set('X-Frame-Options', 'SAMEORIGIN');
      h.set('Referrer-Policy', 'strict-origin-when-cross-origin');
      h.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
      h.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
      h.set('X-Robots-Tag', 'noindex, nofollow');
      h.set('Cache-Control', 'no-store, max-age=0');
      h.delete('Content-Disposition');
      return enhanceHtmlResponse(new Response(notFound.body, { status: 404, headers: h }));
    }

    return enhanceHtmlResponse(new Response(response.body, { status: response.status, statusText: response.statusText, headers: outHeaders }));
  }
};

