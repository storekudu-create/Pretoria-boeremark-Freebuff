// node_modules/hono/dist/request/constants.js
var GET_MATCH_RESULT = Symbol();

// node_modules/hono/dist/utils/buffer.js
var bufferToFormData = (arrayBuffer, contentType) => {
  return new Response(arrayBuffer, { headers: { "Content-Type": contentType.replace(/^[^;]+/, (mediaType) => mediaType.toLowerCase()) } }).formData();
};

// node_modules/hono/dist/utils/body.js
var MAX_NESTED_OBJECTS = 1e4;
var isRawRequest = (request) => "headers" in request;
var parseBody = async (request, options = /* @__PURE__ */ Object.create(null)) => {
  const { all = false, dot = false } = options;
  const mediaType = (isRawRequest(request) ? request.headers : request.raw.headers).get("Content-Type")?.split(";")[0].trim().toLowerCase();
  if (mediaType === "multipart/form-data" || mediaType === "application/x-www-form-urlencoded") return parseFormData(request, {
    all,
    dot
  });
  return {};
};
async function parseFormData(request, options) {
  if (!isRawRequest(request) && request.bodyCache.formData) return convertFormDataToBodyData(await request.bodyCache.formData, options);
  const headers = isRawRequest(request) ? request.headers : request.raw.headers;
  const arrayBuffer = await request.arrayBuffer();
  const formDataPromise = bufferToFormData(arrayBuffer, headers.get("Content-Type") || "");
  if (!isRawRequest(request)) request.bodyCache.formData = formDataPromise;
  const formData = await formDataPromise;
  if (formData) return convertFormDataToBodyData(formData, options);
  return {};
}
function convertFormDataToBodyData(formData, options) {
  const form = /* @__PURE__ */ Object.create(null);
  const nestingState = { count: 0 };
  formData.forEach((value, key) => {
    if (!(options.all || key.endsWith("[]"))) form[key] = value;
    else handleParsingAllValues(form, key, value);
  });
  if (options.dot) Object.entries(form).forEach(([key, value]) => {
    if (key.includes(".")) {
      handleParsingNestedValues(form, key, value, nestingState);
      delete form[key];
    }
  });
  return form;
}
var handleParsingAllValues = (form, key, value) => {
  if (form[key] !== void 0) {
    if (Array.isArray(form[key])) form[key].push(value);
    else form[key] = [form[key], value];
  } else if (!key.endsWith("[]")) form[key] = value;
  else form[key] = [value];
};
var handleParsingNestedValues = (form, key, value, state) => {
  if (/(?:^|\.)__proto__\./.test(key)) return;
  let nestedForm = form;
  const keys = key.split(".", 34);
  if (keys.length > 33) throwNestingLimitExceeded();
  keys.forEach((key2, index) => {
    if (index === keys.length - 1) nestedForm[key2] = value;
    else {
      if (!nestedForm[key2] || typeof nestedForm[key2] !== "object" || Array.isArray(nestedForm[key2]) || nestedForm[key2] instanceof File) {
        if (state.count++ >= MAX_NESTED_OBJECTS) throwNestingLimitExceeded();
        nestedForm[key2] = /* @__PURE__ */ Object.create(null);
      }
      nestedForm = nestedForm[key2];
    }
  });
};
var throwNestingLimitExceeded = () => {
  throw new Error("Nesting limit exceeded");
};

// node_modules/hono/dist/utils/url.js
var splitPath = (path) => {
  const paths = path.split("/");
  if (paths[0] === "") paths.shift();
  return paths;
};
var splitRoutingPath = (routePath) => {
  const { groups, path } = extractGroupsFromPath(routePath);
  const paths = splitPath(path);
  return replaceGroupMarks(paths, groups);
};
var extractGroupsFromPath = (path) => {
  const groups = [];
  path = path.replace(/\{[^}]+\}/g, (match2, index) => {
    const mark = `@${index}`;
    groups.push([mark, match2]);
    return mark;
  });
  return {
    groups,
    path
  };
};
var replaceGroupMarks = (paths, groups) => {
  for (let i = groups.length - 1; i >= 0; i--) {
    const [mark] = groups[i];
    for (let j2 = paths.length - 1; j2 >= 0; j2--) if (paths[j2].includes(mark)) {
      paths[j2] = paths[j2].replace(mark, groups[i][1]);
      break;
    }
  }
  return paths;
};
var patternCache = {};
var getPattern = (label, next) => {
  if (label === "*") return "*";
  const match2 = label.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
  if (match2) {
    const cacheKey = `${label}#${next}`;
    if (!patternCache[cacheKey]) {
      if (match2[2]) patternCache[cacheKey] = next && next[0] !== ":" && next[0] !== "*" ? [
        cacheKey,
        match2[1],
        new RegExp(`^${match2[2]}(?=/${next})`)
      ] : [
        label,
        match2[1],
        new RegExp(`^${match2[2]}$`)
      ];
      else patternCache[cacheKey] = [
        label,
        match2[1],
        true
      ];
    }
    return patternCache[cacheKey];
  }
  return null;
};
var tryDecode = (str, decoder) => {
  try {
    return decoder(str);
  } catch {
    return str.replace(/(?:%[0-9A-Fa-f]{2})+/g, (match2) => {
      try {
        return decoder(match2);
      } catch {
        return match2;
      }
    });
  }
};
var tryDecodeURI = (str) => tryDecode(str, decodeURI);
var getPath = (request) => {
  const url = request.url;
  const start = url.indexOf("/", url.indexOf(":") + 4);
  let i = start;
  for (; i < url.length; i++) {
    const charCode = url.charCodeAt(i);
    if (charCode === 37) {
      const queryIndex = url.indexOf("?", i);
      const hashIndex = url.indexOf("#", i);
      const end = queryIndex === -1 ? hashIndex === -1 ? void 0 : hashIndex : hashIndex === -1 ? queryIndex : Math.min(queryIndex, hashIndex);
      const path = url.slice(start, end);
      return tryDecodeURI(path.includes("%25") ? path.replace(/%25/g, "%2525") : path);
    } else if (charCode === 63 || charCode === 35) break;
  }
  return url.slice(start, i);
};
var getPathNoStrict = (request) => {
  const result = getPath(request);
  return result.length > 1 && result.at(-1) === "/" ? result.slice(0, -1) : result;
};
var mergePath = (base, sub, ...rest) => {
  if (rest.length) sub = mergePath(sub, ...rest);
  return `${base?.[0] === "/" ? "" : "/"}${base}${sub === "/" ? "" : `${base?.at(-1) === "/" ? "" : "/"}${sub?.[0] === "/" ? sub.slice(1) : sub}`}`;
};
var checkOptionalParameter = (path) => {
  if (path.charCodeAt(path.length - 1) !== 63 || !path.includes(":")) return null;
  const segments = path.split("/");
  const results = [];
  let basePath = "";
  segments.forEach((segment) => {
    if (segment !== "" && !/\:/.test(segment)) basePath += "/" + segment;
    else if (/\:/.test(segment)) {
      if (segment.charCodeAt(segment.length - 1) === 63) {
        if (results.length === 0 && basePath === "") results.push("/");
        else results.push(basePath);
        const optionalSegment = segment.slice(0, -1);
        basePath += "/" + optionalSegment;
        results.push(basePath);
      } else basePath += "/" + segment;
    }
  });
  return results.filter((v, i, a) => a.indexOf(v) === i);
};
var tryDecodeURIComponent = (str) => str.indexOf("%") !== -1 ? tryDecode(str, decodeURIComponent_) : str;
var _decodeURI = (value) => {
  if (value.indexOf("+") !== -1) value = value.replace(/\+/g, " ");
  return tryDecodeURIComponent(value);
};
var _getQueryParam = (url, key, multiple) => {
  const hashIndex = url.indexOf("#", 8);
  if (hashIndex !== -1) url = url.slice(0, hashIndex);
  let encoded;
  if (!multiple && key && key.indexOf("%") === -1 && key.indexOf("+") === -1) {
    let keyIndex2 = url.indexOf("?", 8);
    if (keyIndex2 === -1) return;
    if (!url.startsWith(key, keyIndex2 + 1)) keyIndex2 = url.indexOf(`&${key}`, keyIndex2 + 1);
    while (keyIndex2 !== -1) {
      const trailingKeyCode = url.charCodeAt(keyIndex2 + key.length + 1);
      if (trailingKeyCode === 61) {
        const valueIndex = keyIndex2 + key.length + 2;
        const endIndex = url.indexOf("&", valueIndex);
        return _decodeURI(url.slice(valueIndex, endIndex === -1 ? void 0 : endIndex));
      } else if (trailingKeyCode == 38 || isNaN(trailingKeyCode)) return "";
      keyIndex2 = url.indexOf(`&${key}`, keyIndex2 + 1);
    }
    encoded = /[%+]/.test(url);
    if (!encoded) return;
  }
  const results = /* @__PURE__ */ Object.create(null);
  encoded ??= /[%+]/.test(url);
  let keyIndex = url.indexOf("?", 8);
  while (keyIndex !== -1) {
    const nextKeyIndex = url.indexOf("&", keyIndex + 1);
    let valueIndex = url.indexOf("=", keyIndex);
    if (valueIndex > nextKeyIndex && nextKeyIndex !== -1) valueIndex = -1;
    let name = url.slice(keyIndex + 1, valueIndex === -1 ? nextKeyIndex === -1 ? void 0 : nextKeyIndex : valueIndex);
    if (encoded) name = _decodeURI(name);
    keyIndex = nextKeyIndex;
    if (name === "") continue;
    let value;
    if (valueIndex === -1) value = "";
    else {
      value = url.slice(valueIndex + 1, nextKeyIndex === -1 ? void 0 : nextKeyIndex);
      if (encoded) value = _decodeURI(value);
    }
    if (multiple) {
      if (!(results[name] && Array.isArray(results[name]))) results[name] = [];
      results[name].push(value);
    } else results[name] ??= value;
  }
  return key ? results[key] : results;
};
var getQueryParam = _getQueryParam;
var getQueryParams = (url, key) => {
  return _getQueryParam(url, key, true);
};
var decodeURIComponent_ = decodeURIComponent;

// node_modules/hono/dist/request.js
var HonoRequest = class {
  /**
  * `.raw` can get the raw Request object.
  *
  * @see {@link https://hono.dev/docs/api/request#raw}
  *
  * @example
  * ```ts
  * // For Cloudflare Workers
  * app.post('/', async (c) => {
  *   const metadata = c.req.raw.cf?.hostMetadata?
  *   ...
  * })
  * ```
  */
  raw;
  #validatedData;
  #matchResult;
  routeIndex = 0;
  /**
  * `.path` can get the pathname of the request.
  *
  * @see {@link https://hono.dev/docs/api/request#path}
  *
  * @example
  * ```ts
  * app.get('/about/me', (c) => {
  *   const pathname = c.req.path // `/about/me`
  * })
  * ```
  */
  path;
  bodyCache = {};
  constructor(request, path = "/", matchResult = [[]]) {
    this.raw = request;
    this.path = path;
    this.#matchResult = matchResult;
  }
  param(key) {
    return key ? this.#getDecodedParam(key) : this.#getAllDecodedParams();
  }
  #getDecodedParam(key) {
    const paramKey = this.#matchResult[0][this.routeIndex]?.[1][key];
    const param = this.#getParamValue(paramKey);
    return param && tryDecodeURIComponent(param);
  }
  #getAllDecodedParams() {
    const decoded = {};
    const keys = Object.keys(this.#matchResult[0][this.routeIndex]?.[1] ?? {});
    for (const key of keys) {
      const value = this.#getParamValue(this.#matchResult[0][this.routeIndex][1][key]);
      if (value !== void 0) decoded[key] = tryDecodeURIComponent(value);
    }
    return decoded;
  }
  #getParamValue(paramKey) {
    return this.#matchResult[1] ? this.#matchResult[1][paramKey] : paramKey;
  }
  query(key) {
    return getQueryParam(this.url, key);
  }
  queries(key) {
    return getQueryParams(this.url, key);
  }
  header(name) {
    if (name) return this.raw.headers.get(name) ?? void 0;
    const headerData = /* @__PURE__ */ Object.create(null);
    this.raw.headers.forEach((value, key) => {
      headerData[key] = value;
    });
    return headerData;
  }
  async parseBody(options) {
    return parseBody(this, options);
  }
  #cachedBody = (key) => {
    const { bodyCache, raw: raw2 } = this;
    const cachedBody = bodyCache[key];
    if (cachedBody) return cachedBody;
    for (const anyCachedKey in bodyCache) return bodyCache[anyCachedKey].then((body) => {
      if (anyCachedKey === "json") body = JSON.stringify(body);
      const contentType = anyCachedKey === "formData" ? void 0 : raw2.headers.get("content-type");
      return new Response(body, { headers: contentType ? { "Content-Type": contentType } : void 0 })[key]();
    });
    return bodyCache[key] = raw2[key]();
  };
  /**
  * `.json()` can parse Request body of type `application/json`
  *
  * @see {@link https://hono.dev/docs/api/request#json}
  *
  * @example
  * ```ts
  * app.post('/entry', async (c) => {
  *   const body = await c.req.json()
  * })
  * ```
  */
  json() {
    return this.#cachedBody("text").then((text) => JSON.parse(text));
  }
  /**
  * `.text()` can parse Request body of type `text/plain`
  *
  * @see {@link https://hono.dev/docs/api/request#text}
  *
  * @example
  * ```ts
  * app.post('/entry', async (c) => {
  *   const body = await c.req.text()
  * })
  * ```
  */
  text() {
    return this.#cachedBody("text");
  }
  /**
  * `.arrayBuffer()` parse Request body as an `ArrayBuffer`
  *
  * @see {@link https://hono.dev/docs/api/request#arraybuffer}
  *
  * @example
  * ```ts
  * app.post('/entry', async (c) => {
  *   const body = await c.req.arrayBuffer()
  * })
  * ```
  */
  arrayBuffer() {
    return this.#cachedBody("arrayBuffer");
  }
  /**
  * `.bytes()` parses the request body as a `Uint8Array`.
  *
  * @see {@link https://hono.dev/docs/api/request#bytes}
  *
  * @example
  * ```ts
  * app.post('/entry', async (c) => {
  *   const body = await c.req.bytes()
  * })
  * ```
  */
  bytes() {
    return this.#cachedBody("arrayBuffer").then((buffer) => new Uint8Array(buffer));
  }
  /**
  * Parses the request body as a `Blob`.
  * @example
  * ```ts
  * app.post('/entry', async (c) => {
  *   const body = await c.req.blob();
  * });
  * ```
  * @see https://hono.dev/docs/api/request#blob
  */
  blob() {
    return this.#cachedBody("blob");
  }
  /**
  * Parses the request body as `FormData`.
  * @example
  * ```ts
  * app.post('/entry', async (c) => {
  *   const body = await c.req.formData();
  * });
  * ```
  * @see https://hono.dev/docs/api/request#formdata
  */
  formData() {
    return this.#cachedBody("formData");
  }
  /**
  * Adds validated data to the request.
  *
  * @param target - The target of the validation.
  * @param data - The validated data to add.
  */
  addValidatedData(target, data) {
    (this.#validatedData ??= {})[target] = data;
  }
  valid(target) {
    return this.#validatedData?.[target];
  }
  /**
  * `.url` can get the request url strings.
  *
  * @see {@link https://hono.dev/docs/api/request#url}
  *
  * @example
  * ```ts
  * app.get('/about/me', (c) => {
  *   const url = c.req.url // `http://localhost:8787/about/me`
  *   ...
  * })
  * ```
  */
  get url() {
    return this.raw.url;
  }
  /**
  * `.method` can get the method name of the request.
  *
  * @see {@link https://hono.dev/docs/api/request#method}
  *
  * @example
  * ```ts
  * app.get('/about/me', (c) => {
  *   const method = c.req.method // `GET`
  * })
  * ```
  */
  get method() {
    return this.raw.method;
  }
  get [GET_MATCH_RESULT]() {
    return this.#matchResult;
  }
  /**
  * `.matchedRoutes` can return a matched route in the handler
  *
  * @deprecated
  *
  * Use matchedRoutes helper defined in "hono/route" instead.
  *
  * @see {@link https://hono.dev/docs/api/request#matchedroutes}
  *
  * @example
  * ```ts
  * app.use('*', async function logger(c, next) {
  *   await next()
  *   c.req.matchedRoutes.forEach(({ handler, method, path }, i) => {
  *     const name = handler.name || (handler.length < 2 ? '[handler]' : '[middleware]')
  *     console.log(
  *       method,
  *       ' ',
  *       path,
  *       ' '.repeat(Math.max(10 - path.length, 0)),
  *       name,
  *       i === c.req.routeIndex ? '<- respond from here' : ''
  *     )
  *   })
  * })
  * ```
  */
  get matchedRoutes() {
    return this.#matchResult[0].map(([[, route]]) => route);
  }
  /**
  * `.routePath` can retrieve the path registered within the handler
  *
  * @deprecated
  *
  * Use routePath helper defined in "hono/route" instead.
  *
  * @see {@link https://hono.dev/docs/api/request#routepath}
  *
  * @example
  * ```ts
  * app.get('/posts/:id', (c) => {
  *   return c.json({ path: c.req.routePath })
  * })
  * ```
  */
  get routePath() {
    return this.#matchResult[0].map(([[, route]]) => route)[this.routeIndex].path;
  }
};

// node_modules/hono/dist/utils/html.js
var HtmlEscapedCallbackPhase = {
  Stringify: 1,
  BeforeStream: 2,
  Stream: 3
};
var raw = (value, callbacks) => {
  const escapedString = new String(value);
  escapedString.isEscaped = true;
  escapedString.callbacks = callbacks;
  return escapedString;
};
var resolveCallback = async (str, phase, preserveCallbacks, context, buffer) => {
  if (typeof str === "object" && !(str instanceof String)) {
    if (!(str instanceof Promise)) str = str.toString();
    if (str instanceof Promise) str = await str;
  }
  const callbacks = str.callbacks;
  if (!callbacks?.length) return Promise.resolve(str);
  if (buffer) buffer[0] += str;
  else buffer = [str];
  const resStr = Promise.all(callbacks.map((c) => c({
    phase,
    buffer,
    context
  }))).then((res) => Promise.all(res.filter(Boolean).map((str2) => resolveCallback(str2, phase, false, context, buffer))).then(() => buffer[0]));
  if (preserveCallbacks) return raw(await resStr, callbacks);
  else return resStr;
};

// node_modules/hono/dist/context.js
var TEXT_PLAIN = "text/plain; charset=UTF-8";
var setDefaultContentType = (contentType, headers) => {
  return {
    "Content-Type": contentType,
    ...headers
  };
};
var createResponseInstance = (body, init) => new Response(body, init);
var Context = class {
  #rawRequest;
  #req;
  /**
  * `.env` can get bindings (environment variables, secrets, KV namespaces, D1 database, R2 bucket etc.) in Cloudflare Workers.
  *
  * @see {@link https://hono.dev/docs/api/context#env}
  *
  * @example
  * ```ts
  * // Environment object for Cloudflare Workers
  * app.get('*', async c => {
  *   const counter = c.env.COUNTER
  * })
  * ```
  */
  env = {};
  #var;
  finalized = false;
  /**
  * `.error` can get the error object from the middleware if the Handler throws an error.
  *
  * @see {@link https://hono.dev/docs/api/context#error}
  *
  * @example
  * ```ts
  * app.use('*', async (c, next) => {
  *   await next()
  *   if (c.error) {
  *     // do something...
  *   }
  * })
  * ```
  */
  error;
  #status;
  #executionCtx;
  #res;
  #layout;
  #renderer;
  #notFoundHandler;
  #preparedHeaders;
  #matchResult;
  #path;
  /**
  * Creates an instance of the Context class.
  *
  * @param req - The Request object.
  * @param options - Optional configuration options for the context.
  */
  constructor(req, options) {
    this.#rawRequest = req;
    if (options) {
      this.#executionCtx = options.executionCtx;
      this.env = options.env;
      this.#notFoundHandler = options.notFoundHandler;
      this.#path = options.path;
      this.#matchResult = options.matchResult;
    }
  }
  /**
  * `.req` is the instance of {@link HonoRequest}.
  */
  get req() {
    this.#req ??= new HonoRequest(this.#rawRequest, this.#path, this.#matchResult);
    return this.#req;
  }
  /**
  * @see {@link https://hono.dev/docs/api/context#event}
  * The FetchEvent associated with the current request.
  *
  * @throws Will throw an error if the context does not have a FetchEvent.
  */
  get event() {
    if (this.#executionCtx && "respondWith" in this.#executionCtx) return this.#executionCtx;
    else throw Error("This context has no FetchEvent");
  }
  /**
  * @see {@link https://hono.dev/docs/api/context#executionctx}
  * The ExecutionContext associated with the current request.
  *
  * @throws Will throw an error if the context does not have an ExecutionContext.
  */
  get executionCtx() {
    if (this.#executionCtx) return this.#executionCtx;
    else throw Error("This context has no ExecutionContext");
  }
  /**
  * @see {@link https://hono.dev/docs/api/context#res}
  * The Response object for the current request.
  */
  get res() {
    return this.#res ||= createResponseInstance(null, { headers: this.#preparedHeaders ??= new Headers() });
  }
  /**
  * Sets the Response object for the current request.
  *
  * @param _res - The Response object to set.
  */
  set res(_res) {
    if (this.#res && _res) {
      _res = createResponseInstance(_res.body, _res);
      for (const [k, v] of this.#res.headers.entries()) {
        if (k === "content-type") continue;
        if (k === "set-cookie") {
          const cookies = this.#res.headers.getSetCookie();
          _res.headers.delete("set-cookie");
          for (const cookie of cookies) _res.headers.append("set-cookie", cookie);
        } else _res.headers.set(k, v);
      }
    }
    this.#res = _res;
    this.finalized = true;
  }
  /**
  * `.render()` can create a response within a layout.
  *
  * @see {@link https://hono.dev/docs/api/context#render-setrenderer}
  *
  * @example
  * ```ts
  * app.get('/', (c) => {
  *   return c.render('Hello!')
  * })
  * ```
  */
  render = (...args) => {
    this.#renderer ??= (content) => this.html(content);
    return this.#renderer(...args);
  };
  /**
  * Sets the layout for the response.
  *
  * @param layout - The layout to set.
  * @returns The layout function.
  */
  setLayout = (layout) => this.#layout = layout;
  /**
  * Gets the current layout for the response.
  *
  * @returns The current layout function.
  */
  getLayout = () => this.#layout;
  /**
  * `.setRenderer()` can set the layout in the custom middleware.
  *
  * @see {@link https://hono.dev/docs/api/context#render-setrenderer}
  *
  * @example
  * ```tsx
  * app.use('*', async (c, next) => {
  *   c.setRenderer((content) => {
  *     return c.html(
  *       <html>
  *         <body>
  *           <p>{content}</p>
  *         </body>
  *       </html>
  *     )
  *   })
  *   await next()
  * })
  * ```
  */
  setRenderer = (renderer) => {
    this.#renderer = renderer;
  };
  /**
  * `.header()` can set headers.
  *
  * @see {@link https://hono.dev/docs/api/context#header}
  *
  * @example
  * ```ts
  * app.get('/welcome', (c) => {
  *   // Set headers
  *   c.header('X-Message', 'Hello!')
  *   c.header('Content-Type', 'text/plain')
  *
  *   // Append multiple headers using the append option (e.g. Vary)
  *   c.header('Vary', 'Accept-Encoding', { append: true })
  *   c.header('Vary', 'User-Agent', { append: true })
  *
  *   return c.body('Thank you for coming')
  * })
  * ```
  */
  header = (name, value, options) => {
    if (this.finalized) this.#res = createResponseInstance(this.#res.body, this.#res);
    const headers = this.#res ? this.#res.headers : this.#preparedHeaders ??= new Headers();
    if (value === void 0) headers.delete(name);
    else if (options?.append) headers.append(name, value);
    else headers.set(name, value);
  };
  status = (status) => {
    this.#status = status;
  };
  /**
  * `.set()` can set the value specified by the key.
  *
  * @see {@link https://hono.dev/docs/api/context#set-get}
  *
  * @example
  * ```ts
  * app.use('*', async (c, next) => {
  *   c.set('message', 'Hono is hot!!')
  *   await next()
  * })
  * ```
  */
  set = (key, value) => {
    this.#var ??= /* @__PURE__ */ new Map();
    this.#var.set(key, value);
  };
  /**
  * `.get()` can use the value specified by the key.
  *
  * @see {@link https://hono.dev/docs/api/context#set-get}
  *
  * @example
  * ```ts
  * app.get('/', (c) => {
  *   const message = c.get('message')
  *   return c.text(`The message is "${message}"`)
  * })
  * ```
  */
  get = (key) => {
    return this.#var ? this.#var.get(key) : void 0;
  };
  /**
  * `.var` can access the value of a variable.
  *
  * @see {@link https://hono.dev/docs/api/context#var}
  *
  * @example
  * ```ts
  * const result = c.var.client.oneMethod()
  * ```
  */
  get var() {
    if (!this.#var) return {};
    return Object.fromEntries(this.#var);
  }
  #newResponse(data, arg, headers) {
    let responseHeaders = this.#res ? new Headers(this.#res.headers) : this.#preparedHeaders;
    if (typeof arg === "object" && arg.headers) {
      responseHeaders ??= new Headers();
      for (const [key, value] of new Headers(arg.headers)) if (key === "set-cookie") responseHeaders.append(key, value);
      else responseHeaders.set(key, value);
    }
    if (headers) {
      if (!responseHeaders) {
        let count = 0;
        for (const k in headers) if (++count > 1 || typeof headers[k] !== "string") {
          responseHeaders = new Headers();
          break;
        }
      }
      if (responseHeaders) for (const k in headers) {
        const v = headers[k];
        if (typeof v === "string") responseHeaders.set(k, v);
        else {
          responseHeaders.delete(k);
          for (const v2 of v) responseHeaders.append(k, v2);
        }
      }
    }
    const status = typeof arg === "number" ? arg : arg?.status ?? this.#status;
    return createResponseInstance(data, {
      status,
      headers: responseHeaders ?? headers
    });
  }
  newResponse = (...args) => this.#newResponse(...args);
  /**
  * `.body()` can return the HTTP response.
  * You can set headers with `.header()` and set HTTP status code with `.status`.
  * This can also be set in `.text()`, `.json()` and so on.
  *
  * @see {@link https://hono.dev/docs/api/context#body}
  *
  * @example
  * ```ts
  * app.get('/welcome', (c) => {
  *   // Set headers
  *   c.header('X-Message', 'Hello!')
  *   c.header('Content-Type', 'text/plain')
  *   // Set HTTP status code
  *   c.status(201)
  *
  *   // Return the response body
  *   return c.body('Thank you for coming')
  * })
  * ```
  */
  body = (data, arg, headers) => this.#newResponse(data, arg, headers);
  /**
  * `.text()` can render text as `Content-Type:text/plain`.
  *
  * @see {@link https://hono.dev/docs/api/context#text}
  *
  * @example
  * ```ts
  * app.get('/say', (c) => {
  *   return c.text('Hello!')
  * })
  * ```
  */
  text = (text, arg, headers) => {
    return !this.#preparedHeaders && !this.#status && !arg && !headers && !this.finalized ? new Response(text) : this.#newResponse(text, arg, setDefaultContentType(TEXT_PLAIN, headers));
  };
  /**
  * `.json()` can render JSON as `Content-Type:application/json`.
  *
  * @see {@link https://hono.dev/docs/api/context#json}
  *
  * @example
  * ```ts
  * app.get('/api', (c) => {
  *   return c.json({ message: 'Hello!' })
  * })
  * ```
  */
  json = (object, arg, headers) => {
    return this.#newResponse(JSON.stringify(object), arg, setDefaultContentType("application/json", headers));
  };
  html = (html, arg, headers) => {
    const res = (html2) => this.#newResponse(html2, arg, setDefaultContentType("text/html; charset=UTF-8", headers));
    return typeof html === "object" ? resolveCallback(html, HtmlEscapedCallbackPhase.Stringify, false, {}).then(res) : res(html);
  };
  /**
  * `.redirect()` can Redirect, default status code is 302.
  *
  * @see {@link https://hono.dev/docs/api/context#redirect}
  *
  * @example
  * ```ts
  * app.get('/redirect', (c) => {
  *   return c.redirect('/')
  * })
  * app.get('/redirect-permanently', (c) => {
  *   return c.redirect('/', 301)
  * })
  * ```
  */
  redirect = (location, status) => {
    const locationString = String(location);
    this.header("Location", !/[^\x00-\xFF]/.test(locationString) ? locationString : encodeURI(locationString));
    return this.newResponse(null, status ?? 302);
  };
  /**
  * `.notFound()` can return the Not Found Response.
  *
  * @see {@link https://hono.dev/docs/api/context#notfound}
  *
  * @example
  * ```ts
  * app.get('/notfound', (c) => {
  *   return c.notFound()
  * })
  * ```
  */
  notFound = () => {
    this.#notFoundHandler ??= () => createResponseInstance();
    return this.#notFoundHandler(this);
  };
};

// node_modules/hono/dist/compose.js
var compose = (middleware, onError, onNotFound) => {
  return (context, next) => {
    let index = -1;
    return dispatch(0);
    async function dispatch(i) {
      if (i <= index) throw new Error("next() called multiple times");
      index = i;
      let res;
      let isError = false;
      let handler;
      if (middleware[i]) {
        handler = middleware[i][0][0];
        context.req.routeIndex = i;
      } else handler = i === middleware.length && next || void 0;
      if (handler) try {
        res = await handler(context, () => dispatch(i + 1));
      } catch (err) {
        if (err instanceof Error && onError) {
          context.error = err;
          res = await onError(err, context);
          isError = true;
        } else throw err;
      }
      else if (context.finalized === false && onNotFound) res = await onNotFound(context);
      if (res && (context.finalized === false || isError)) context.res = res;
      return context;
    }
  };
};

// node_modules/hono/dist/router.js
var METHODS = [
  "get",
  "post",
  "put",
  "delete",
  "options",
  "patch",
  "query"
];
var MESSAGE_MATCHER_IS_ALREADY_BUILT = "Can not add a route since the matcher is already built.";
var UnsupportedPathError = class extends Error {
};

// node_modules/hono/dist/utils/constants.js
var COMPOSED_HANDLER = "__COMPOSED_HANDLER";

// node_modules/hono/dist/hono-base.js
var notFoundHandler = (c) => {
  return c.text("404 Not Found", 404);
};
var errorHandler = (err, c) => {
  if ("getResponse" in err) {
    const res = err.getResponse();
    return c.newResponse(res.body, res);
  }
  console.error(err);
  return c.text("Internal Server Error", 500);
};
var Hono = class Hono2 {
  get;
  post;
  put;
  delete;
  options;
  patch;
  query;
  all;
  on;
  use;
  router;
  getPath;
  _basePath = "/";
  #path = "/";
  routes = [];
  constructor(options = {}) {
    [...METHODS, "all"].forEach((method) => {
      this[method] = (args1, ...args) => {
        const methodName = method.toUpperCase();
        if (typeof args1 === "string") this.#path = args1;
        else this.#addRoute(methodName, this.#path, args1);
        args.forEach((handler) => {
          this.#addRoute(methodName, this.#path, handler);
        });
        return this;
      };
    });
    this.on = (method, path, ...handlers) => {
      for (const p of [path].flat()) {
        this.#path = p;
        for (const m of [method].flat()) {
          const methodName = m.toUpperCase();
          for (const handler of handlers) this.#addRoute(methodName, this.#path, handler);
        }
      }
      return this;
    };
    this.use = (arg1, ...handlers) => {
      if (typeof arg1 === "string") this.#path = arg1;
      else {
        this.#path = "*";
        handlers.unshift(arg1);
      }
      handlers.forEach((handler) => {
        this.#addRoute("ALL", this.#path, handler);
      });
      return this;
    };
    const { strict, ...optionsWithoutStrict } = options;
    Object.assign(this, optionsWithoutStrict);
    this.getPath = strict ?? true ? options.getPath ?? getPath : getPathNoStrict;
  }
  #clone() {
    const clone = new Hono2({
      router: this.router,
      getPath: this.getPath
    });
    clone.errorHandler = this.errorHandler;
    clone.#notFoundHandler = this.#notFoundHandler;
    clone.routes = this.routes;
    return clone;
  }
  #notFoundHandler = notFoundHandler;
  errorHandler = errorHandler;
  /**
  * `.route()` allows grouping other Hono instance in routes.
  *
  * @see {@link https://hono.dev/docs/api/routing#grouping}
  *
  * @param {string} path - base Path
  * @param {Hono} app - other Hono instance
  * @returns {Hono} routed Hono instance
  *
  * @example
  * ```ts
  * const app = new Hono()
  * const app2 = new Hono()
  *
  * app2.get("/user", (c) => c.text("user"))
  * app.route("/api", app2) // GET /api/user
  * ```
  */
  route(path, app2) {
    const subApp = this.basePath(path);
    app2.routes.map((r) => {
      let handler;
      if (app2.errorHandler === errorHandler) handler = r.handler;
      else {
        handler = async (c, next) => (await compose([], app2.errorHandler)(c, () => r.handler(c, next))).res;
        handler[COMPOSED_HANDLER] = r.handler;
      }
      subApp.#addRoute(r.method, r.path, handler, r.basePath);
    });
    return this;
  }
  /**
  * `.basePath()` allows base paths to be specified.
  *
  * @see {@link https://hono.dev/docs/api/routing#base-path}
  *
  * @param {string} path - base Path
  * @returns {Hono} changed Hono instance
  *
  * @example
  * ```ts
  * const api = new Hono().basePath('/api')
  * ```
  */
  basePath(path) {
    const subApp = this.#clone();
    subApp._basePath = mergePath(this._basePath, path);
    return subApp;
  }
  /**
  * `.onError()` handles an error and returns a customized Response.
  *
  * @see {@link https://hono.dev/docs/api/hono#error-handling}
  *
  * @param {ErrorHandler} handler - request Handler for error
  * @returns {Hono} changed Hono instance
  *
  * @example
  * ```ts
  * app.onError((err, c) => {
  *   console.error(`${err}`)
  *   return c.text('Custom Error Message', 500)
  * })
  * ```
  */
  onError = (handler) => {
    this.errorHandler = handler;
    return this;
  };
  /**
  * `.notFound()` allows you to customize a Not Found Response.
  *
  * @see {@link https://hono.dev/docs/api/hono#not-found}
  *
  * @param {NotFoundHandler} handler - request handler for not-found
  * @returns {Hono} changed Hono instance
  *
  * @example
  * ```ts
  * app.notFound((c) => {
  *   return c.text('Custom 404 Message', 404)
  * })
  * ```
  */
  notFound = (handler) => {
    this.#notFoundHandler = handler;
    return this;
  };
  /**
  * `.mount()` allows you to mount applications built with other frameworks into your Hono application.
  *
  * @deprecated Use `mount()` from `hono/mount` instead. `.mount()` will be removed in v5.
  *
  * @see {@link https://hono.dev/docs/api/hono#mount}
  *
  * @param {string} path - base Path
  * @param {Function} applicationHandler - other Request Handler
  * @param {MountOptions} [options] - options of `.mount()`
  * @returns {Hono} mounted Hono instance
  *
  * @example
  * ```ts
  * import { Router as IttyRouter } from 'itty-router'
  * import { Hono } from 'hono'
  * // Create itty-router application
  * const ittyRouter = IttyRouter()
  * // GET /itty-router/hello
  * ittyRouter.get('/hello', () => new Response('Hello from itty-router'))
  *
  * const app = new Hono()
  * app.mount('/itty-router', ittyRouter.handle)
  * ```
  *
  * @example
  * ```ts
  * const app = new Hono()
  * // Send the request to another application without modification.
  * app.mount('/app', anotherApp, {
  *   replaceRequest: (req) => req,
  * })
  * ```
  */
  mount(path, applicationHandler, options) {
    let replaceRequest;
    let optionHandler;
    if (options) {
      if (typeof options === "function") optionHandler = options;
      else {
        optionHandler = options.optionHandler;
        if (options.replaceRequest === false) replaceRequest = (request) => request;
        else replaceRequest = options.replaceRequest;
      }
    }
    const getOptions = optionHandler ? (c) => {
      const options2 = optionHandler(c);
      return Array.isArray(options2) ? options2 : [options2];
    } : (c) => {
      let executionContext = void 0;
      try {
        executionContext = c.executionCtx;
      } catch {
      }
      return [c.env, executionContext];
    };
    replaceRequest ||= (() => {
      const mergedPath = mergePath(this._basePath, path);
      const pathPrefixLength = mergedPath === "/" ? 0 : mergedPath.length;
      return (request) => {
        const url = new URL(request.url);
        url.pathname = this.getPath(request).slice(pathPrefixLength) || "/";
        return new Request(url, request);
      };
    })();
    const handler = async (c, next) => {
      const res = await applicationHandler(replaceRequest(c.req.raw), ...getOptions(c));
      if (res) return res;
      await next();
    };
    this.#addRoute("ALL", mergePath(path, "*"), handler);
    return this;
  }
  #addRoute(method, path, handler, baseRoutePath) {
    path = mergePath(this._basePath, path);
    const r = {
      basePath: baseRoutePath !== void 0 ? mergePath(this._basePath, baseRoutePath) : this._basePath,
      path,
      method,
      handler
    };
    this.router.add(method, path, [handler, r]);
    this.routes.push(r);
  }
  #handleError(err, c) {
    if (err instanceof Error) return this.errorHandler(err, c);
    throw err;
  }
  #dispatch(request, executionCtx, env, method) {
    if (method === "HEAD") return (async () => new Response(null, await this.#dispatch(request, executionCtx, env, "GET")))();
    const path = this.getPath(request, { env });
    const matchResult = this.router.match(method, path);
    const c = new Context(request, {
      path,
      matchResult,
      env,
      executionCtx,
      notFoundHandler: this.#notFoundHandler
    });
    if (matchResult[0].length === 1) {
      let res;
      try {
        res = matchResult[0][0][0][0](c, async () => {
          c.res = await this.#notFoundHandler(c);
        });
      } catch (err) {
        return this.#handleError(err, c);
      }
      return res instanceof Promise ? res.then((resolved) => resolved || (c.finalized ? c.res : this.#notFoundHandler(c))).catch((err) => this.#handleError(err, c)) : res ?? this.#notFoundHandler(c);
    }
    const composed = compose(matchResult[0], this.errorHandler, this.#notFoundHandler);
    return (async () => {
      try {
        const context = await composed(c);
        if (!context.finalized) throw new Error("Context is not finalized. Did you forget to return a Response object or `await next()`?");
        return context.res;
      } catch (err) {
        return this.#handleError(err, c);
      }
    })();
  }
  /**
  * `.fetch()` will be entry point of your app.
  *
  * @see {@link https://hono.dev/docs/api/hono#fetch}
  *
  * @param {Request} request - request Object of request
  * @param {Env} env - env Object
  * @param {ExecutionContext} executionCtx - context of execution
  * @returns {Response | Promise<Response>} response of request
  *
  */
  fetch = (request, ...rest) => {
    return this.#dispatch(request, rest[1], rest[0], request.method);
  };
  /**
  * `.request()` is a useful method for testing.
  * You can pass a URL or pathname to send a GET request.
  * app will return a Response object.
  * ```ts
  * test('GET /hello is ok', async () => {
  *   const res = await app.request('/hello')
  *   expect(res.status).toBe(200)
  * })
  * ```
  * @see https://hono.dev/docs/api/hono#request
  */
  request = (input, requestInit, Env, executionCtx) => {
    if (input instanceof Request) return this.fetch(requestInit ? new Request(input, requestInit) : input, Env, executionCtx);
    input = input.toString();
    return this.fetch(new Request(/^https?:\/\//.test(input) ? input : `http://localhost${mergePath("/", input)}`, requestInit), Env, executionCtx);
  };
  /**
  * `.fire()` automatically adds a global fetch event listener.
  * This can be useful for environments that adhere to the Service Worker API, such as non-ES module Cloudflare Workers.
  * @deprecated
  * Use `fire` from `hono/service-worker` instead.
  * ```ts
  * import { Hono } from 'hono'
  * import { fire } from 'hono/service-worker'
  *
  * const app = new Hono()
  * // ...
  * fire(app)
  * ```
  * @see https://hono.dev/docs/api/hono#fire
  * @see https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API
  * @see https://developers.cloudflare.com/workers/reference/migrate-to-module-workers/
  */
  fire = () => {
    addEventListener("fetch", (event) => {
      event.respondWith(this.#dispatch(event.request, event, void 0, event.request.method));
    });
  };
};

// node_modules/hono/dist/router/utils.js
var createNullObject = () => /* @__PURE__ */ Object.create(null);

// node_modules/hono/dist/router/reg-exp-router/matcher.js
var emptyParam = [];
function match(method, path) {
  const matchers = this.buildAllMatchers();
  const match2 = (method2, path2) => {
    const matcher = matchers[method2] || matchers["ALL"];
    const staticMatch = matcher[2][path2];
    if (staticMatch) return staticMatch;
    const match3 = path2.match(matcher[0]);
    if (!match3) return [[], emptyParam];
    const index = match3.indexOf("", 1);
    return [matcher[1][index], match3];
  };
  this.match = match2;
  return match2(method, path);
}

// node_modules/hono/dist/router/reg-exp-router/node.js
var LABEL_REG_EXP_STR = "[^/]+";
var TAIL_WILDCARD_REG_EXP_STR = "(?:|/.*)";
var PATH_ERROR = Symbol();
var regExpMetaChars = /* @__PURE__ */ new Set(".\\+*[^]$()");
function compareKey(a, b) {
  if (a.length === 1) return b.length === 1 ? a < b ? -1 : 1 : -1;
  if (b.length === 1) return 1;
  if (a === ".*" || a === "(?:|/.*)") return b === "(?:|/.*)" ? -1 : 1;
  else if (b === ".*" || b === "(?:|/.*)") return -1;
  if (a === "[^/]+") return 1;
  else if (b === "[^/]+") return -1;
  return a.length === b.length ? a < b ? -1 : 1 : b.length - a.length;
}
var Node = class Node2 {
  #index;
  #varIndex;
  #children = createNullObject();
  insert(tokens, index, paramMap, context, isStatic) {
    let node = this;
    for (let i = 0, len = tokens.length; i < len; i++) {
      const token = tokens[i];
      const pattern = token.length === 1 ? token === "*" ? i === len - 1 ? [
        "",
        "",
        ".*"
      ] : [
        "",
        "",
        LABEL_REG_EXP_STR
      ] : null : token === "/*" ? [
        "",
        "",
        TAIL_WILDCARD_REG_EXP_STR
      ] : token.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
      let nextNode;
      if (pattern) {
        const name = pattern[1];
        let regexpStr = pattern[2] || "[^/]+";
        if (name && pattern[2]) {
          if (regexpStr === ".*") throw PATH_ERROR;
          regexpStr = regexpStr.replace(/^\((?!\?:)(?=[^)]+\)$)/, "(?:");
          if (/\((?!\?:)/.test(regexpStr)) throw PATH_ERROR;
          if (regexpStr.length === 1 && regExpMetaChars.has(regexpStr)) throw PATH_ERROR;
        }
        nextNode = node.#children[regexpStr];
        if (!nextNode) {
          if (regexpStr !== ".*" && regexpStr !== "(?:|/.*)") {
            for (const k in node.#children) if ((regexpStr.length > 1 || k.length > 1) && k !== ".*" && k !== "(?:|/.*)") throw PATH_ERROR;
          }
          nextNode = node.#children[regexpStr] = new Node2();
        }
        if (name !== "") {
          nextNode.#varIndex ??= context.varIndex++;
          paramMap.push([name, nextNode.#varIndex]);
        }
      } else {
        nextNode = node.#children[token];
        if (!nextNode) {
          for (const k in node.#children) if (k.length > 1 && k !== ".*" && k !== "(?:|/.*)") throw PATH_ERROR;
          nextNode = node.#children[token] = new Node2();
        }
      }
      node = nextNode;
    }
    if (node.#index !== void 0) throw PATH_ERROR;
    node.#index = isStatic ? -1 : index;
  }
  buildRegExpStr() {
    const strList = Object.keys(this.#children).sort(compareKey).map((k) => {
      const c = this.#children[k];
      const childStr = c.buildRegExpStr();
      return childStr === "" ? "" : (typeof c.#varIndex === "number" ? `(${k})@${c.#varIndex}` : regExpMetaChars.has(k) ? `\\${k}` : k) + childStr;
    }).filter(Boolean);
    if (typeof this.#index === "number" && this.#index !== -1) strList.unshift(`#${this.#index}`);
    if (strList.length === 0) return "";
    if (strList.length === 1) return strList[0];
    return "(?:" + strList.join("|") + ")";
  }
};

// node_modules/hono/dist/router/reg-exp-router/trie.js
var Trie = class {
  #context = { varIndex: 0 };
  #root = new Node();
  #index = 0;
  paths = createNullObject();
  insert(path, isStatic) {
    if (isStatic) {
      this.#root.insert(path.split(""), 0, [], this.#context, true);
      return;
    }
    const paramAssoc = [];
    const groups = [];
    let markedPath = path;
    for (let i = 0; ; ) {
      let replaced = false;
      markedPath = markedPath.replace(/\{[^}]+\}/g, (m) => {
        const mark = `@\\${i}`;
        groups[i] = [mark, m];
        i++;
        replaced = true;
        return mark;
      });
      if (!replaced) break;
    }
    const tokens = markedPath.match(/(?::[^\/]+)|(?:\/\*$)|./g) || [];
    for (let i = groups.length - 1; i >= 0; i--) {
      const [mark] = groups[i];
      for (let j2 = tokens.length - 1; j2 >= 0; j2--) if (tokens[j2].indexOf(mark) !== -1) {
        tokens[j2] = tokens[j2].replace(mark, groups[i][1]);
        break;
      }
    }
    this.#root.insert(tokens, this.#index, paramAssoc, this.#context, false);
    this.paths[path] = [this.#index++, paramAssoc];
  }
  buildRegExp() {
    let regexp = this.#root.buildRegExpStr();
    if (regexp === "") return [
      /^$/,
      [],
      []
    ];
    let captureIndex = 0;
    const indexReplacementMap = [];
    const paramReplacementMap = [];
    regexp = regexp.replace(/#(\d+)|@(\d+)|\.\*\$/g, (_, handlerIndex, paramIndex) => {
      if (handlerIndex !== void 0) {
        indexReplacementMap[++captureIndex] = Number(handlerIndex);
        return "$()";
      }
      if (paramIndex !== void 0) {
        paramReplacementMap[Number(paramIndex)] = ++captureIndex;
        return "";
      }
      return "";
    });
    return [
      new RegExp(`^${regexp}`),
      indexReplacementMap,
      paramReplacementMap
    ];
  }
};

// node_modules/hono/dist/router/reg-exp-router/router.js
var wildcardRegExpCache = createNullObject();
function buildWildcardRegExp(path) {
  return wildcardRegExpCache[path] ??= new RegExp(`^${path.replace(/\/:[^/{}]+(?:\{\[\^\/]\+})?(?=[/{]|$)|\/?\*$|([.\\+*[^\]$()?{}|])/g, (match2, metaChar) => metaChar ? `\\${metaChar}` : match2 === "/*" ? TAIL_WILDCARD_REG_EXP_STR : match2 === "*" ? ".*" : `/:${LABEL_REG_EXP_STR}`)}$`);
}
function findMiddleware(middleware, path) {
  for (const k of Object.keys(middleware).sort((a, b) => b.length - a.length)) if (buildWildcardRegExp(k).test(path)) return [...middleware[k]];
}
var RegExpRouter = class {
  name = "RegExpRouter";
  #middleware;
  #routes;
  #tries;
  constructor() {
    this.#middleware = { ["ALL"]: createNullObject() };
    this.#routes = { ["ALL"]: createNullObject() };
    this.#tries = { ["ALL"]: new Trie() };
  }
  #insertPath(method, path) {
    try {
      this.#tries[method].insert(path, !/\*|\/:/.test(path));
    } catch (e) {
      throw e === PATH_ERROR ? new UnsupportedPathError(path) : e;
    }
  }
  add(method, path, handler) {
    const middleware = this.#middleware;
    const routes = this.#routes;
    if (!middleware) throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
    if (!middleware[method]) {
      this.#tries[method] = new Trie();
      for (const handlerMap of [middleware, routes]) {
        handlerMap[method] = createNullObject();
        for (const p in handlerMap["ALL"]) {
          handlerMap[method][p] = [...handlerMap["ALL"][p]];
          this.#insertPath(method, p);
        }
      }
    }
    if (path === "/*") path = "*";
    const methods = method === "ALL" ? Object.keys(middleware) : [method];
    if (/\*$/.test(path)) {
      const re = buildWildcardRegExp(path);
      for (const m of methods) if (!middleware[m][path]) {
        this.#insertPath(m, path);
        middleware[m][path] = findMiddleware(middleware[m], path) || findMiddleware(middleware["ALL"], path) || [];
      }
      for (const handlerMap of [middleware, routes]) for (const m of methods) for (const p in handlerMap[m]) re.test(p) && handlerMap[m][p].push([handler, path]);
      return;
    }
    const paths = checkOptionalParameter(path) || [path];
    for (const path2 of paths) for (const m of methods) {
      if (!routes[m][path2]) {
        this.#insertPath(m, path2);
        routes[m][path2] = findMiddleware(middleware[m], path2) || findMiddleware(middleware["ALL"], path2) || [];
      }
      routes[m][path2].push([handler, path2]);
    }
  }
  match = match;
  buildAllMatchers() {
    const matchers = createNullObject();
    for (const method of Object.keys(this.#routes)) matchers[method] = this.#buildMatcher(method);
    this.#middleware = this.#routes = this.#tries = void 0;
    wildcardRegExpCache = createNullObject();
    return matchers;
  }
  #buildMatcher(method) {
    const middleware = this.#middleware[method];
    const routes = this.#routes[method];
    const trie = this.#tries[method];
    const staticMap = createNullObject();
    const handlerData = [];
    const [regexp, indexReplacementMap, paramReplacementMap] = trie.buildRegExp();
    for (const r of [middleware, routes]) for (const path in r) {
      const handlers = r[path];
      const pathData = trie.paths[path];
      if (!pathData) {
        staticMap[path] = [handlers.map(([h]) => [h, createNullObject()]), emptyParam];
        continue;
      }
      handlerData[pathData[0]] = handlers.map(([h, handlerPath]) => [h, trie.paths[handlerPath][1].reduceRight((map, [key], i) => {
        map[key] = paramReplacementMap[pathData[1][i][1]];
        return map;
      }, createNullObject())]);
    }
    return [
      regexp,
      indexReplacementMap.map((i) => handlerData[i]),
      staticMap
    ];
  }
};

// node_modules/hono/dist/router/smart-router/router.js
var SmartRouter = class {
  name = "SmartRouter";
  #routers = [];
  #routes = [];
  constructor(init) {
    this.#routers = init.routers;
  }
  add(method, path, handler) {
    if (!this.#routes) throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
    this.#routes.push([
      method,
      path,
      handler
    ]);
  }
  match(method, path) {
    if (!this.#routes) throw new Error("Fatal error");
    const routers = this.#routers;
    const routes = this.#routes;
    const len = routers.length;
    let i = 0;
    let res;
    for (; i < len; i++) {
      const router = routers[i];
      try {
        for (let i2 = 0, len2 = routes.length; i2 < len2; i2++) router.add(...routes[i2]);
        res = router.match(method, path);
      } catch (e) {
        if (e instanceof UnsupportedPathError) continue;
        throw e;
      }
      this.match = router.match.bind(router);
      this.#routers = [router];
      this.#routes = void 0;
      break;
    }
    if (i === len) throw new Error("Fatal error");
    this.name = `SmartRouter + ${this.activeRouter.name}`;
    return res;
  }
  get activeRouter() {
    if (this.#routes || this.#routers.length !== 1) throw new Error("No active router has been determined yet.");
    return this.#routers[0];
  }
};

// node_modules/hono/dist/router/trie-router/node.js
var emptyParams = createNullObject();
var order = 0;
var Node3 = class Node4 {
  #methods = [];
  #children = createNullObject();
  #patterns = [];
  #pattern;
  #params = emptyParams;
  insert(method, path, handler) {
    let curNode = this;
    const parts = splitRoutingPath(path);
    const possibleKeys = /* @__PURE__ */ new Set();
    let i = 0;
    for (const p of parts) {
      const nextP = parts[++i];
      const pattern = getPattern(p, nextP) || (nextP === void 0 && p && p.indexOf("*") === p.length - 1 ? p : null);
      const isParam = Array.isArray(pattern);
      const key = isParam ? pattern[0] : pattern || p;
      const child = curNode.#children[key] ||= new Node4();
      if (pattern && !child.#pattern) {
        child.#pattern = pattern;
        curNode.#patterns.push(child);
      }
      curNode = child;
      if (isParam) possibleKeys.add(pattern[1]);
    }
    curNode.#methods.push({ [method]: {
      handler,
      possibleKeys: [...possibleKeys],
      score: ++order
    } });
  }
  #pushHandlerSets(handlerSets, node, method, nodeParams, params) {
    for (let i = 0, len = node.#methods.length; i < len; i++) {
      const m = node.#methods[i];
      const handlerSet = m[method] || m["ALL"];
      if (handlerSet) {
        handlerSet.params = createNullObject();
        handlerSets.push(handlerSet);
        for (let i2 = 0, len2 = handlerSet.possibleKeys.length; i2 < len2; i2++) {
          const key = handlerSet.possibleKeys[i2];
          handlerSet.params[key] = params?.[key] && !i2 ? params[key] : nodeParams[key] ?? params?.[key];
        }
      }
    }
  }
  search(method, path) {
    const handlerSets = [];
    this.#params = emptyParams;
    let curNodes = [this];
    const parts = splitPath(path);
    const curNodesQueue = [];
    const len = parts.length;
    let partOffsets = null;
    for (let i = 0; i < len; i++) {
      const part = parts[i];
      const isLast = i === len - 1;
      const tempNodes = [];
      for (let j2 = 0, len2 = curNodes.length; j2 < len2; j2++) {
        const node = curNodes[j2];
        const nextNode = node.#children[part];
        if (nextNode) {
          nextNode.#params = node.#params;
          if (isLast) {
            if (nextNode.#children["*"]) this.#pushHandlerSets(handlerSets, nextNode.#children["*"], method, node.#params);
            this.#pushHandlerSets(handlerSets, nextNode, method, node.#params);
          } else tempNodes.push(nextNode);
        }
        for (const child of node.#patterns) {
          const pattern = child.#pattern;
          const params = node.#params === emptyParams ? {} : { ...node.#params };
          if (typeof pattern === "string") {
            if (pattern === "*" || part.startsWith(pattern.slice(0, -1))) {
              this.#pushHandlerSets(handlerSets, child, method, node.#params);
              if (pattern === "*") {
                child.#params = params;
                tempNodes.push(child);
              }
            }
            continue;
          }
          const [, name, matcher] = pattern;
          if (!part && matcher === true) continue;
          if (matcher !== true) {
            if (!partOffsets) {
              partOffsets = [];
              let offset = path[0] === "/" ? 1 : 0;
              for (let p = 0; p < len; p++) {
                partOffsets[p] = offset;
                offset += parts[p].length + 1;
              }
            }
            const restPathString = path.slice(partOffsets[i]);
            const m = matcher.exec(restPathString);
            if (m) {
              params[name] = m[0];
              this.#pushHandlerSets(handlerSets, child, method, node.#params, params);
              if (m[0].length === restPathString.length && child.#children["*"]) this.#pushHandlerSets(handlerSets, child.#children["*"], method, node.#params, params);
              for (const _ in child.#children) {
                child.#params = params;
                const componentCount = m[0].match(/\//g)?.length ?? 0;
                (curNodesQueue[componentCount] ||= []).push(child);
                break;
              }
              continue;
            }
          }
          if (matcher === true || matcher.test(part)) {
            params[name] = part;
            if (isLast) {
              this.#pushHandlerSets(handlerSets, child, method, params, node.#params);
              if (child.#children["*"]) this.#pushHandlerSets(handlerSets, child.#children["*"], method, params, node.#params);
            } else {
              child.#params = params;
              tempNodes.push(child);
            }
          }
        }
      }
      const shifted = curNodesQueue.shift();
      curNodes = shifted ? tempNodes.concat(shifted) : tempNodes;
    }
    if (handlerSets[1]) handlerSets.sort((a, b) => {
      return a.score - b.score;
    });
    return [handlerSets.map(({ handler, params }) => [handler, params])];
  }
};

// node_modules/hono/dist/router/trie-router/router.js
var TrieRouter = class {
  name = "TrieRouter";
  #node = new Node3();
  add(method, path, handler) {
    for (const result of checkOptionalParameter(path) || [path]) this.#node.insert(method, result, handler);
  }
  match(method, path) {
    return this.#node.search(method, path);
  }
};

// node_modules/hono/dist/hono.js
var Hono3 = class extends Hono {
  /**
  * Creates an instance of the Hono class.
  *
  * @param options - Optional configuration options for the Hono instance.
  */
  constructor(options = {}) {
    super(options);
    this.router = options.router ?? new SmartRouter({ routers: [new RegExpRouter(), new TrieRouter()] });
  }
};

// worker/db.ts
var SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY, name_en TEXT NOT NULL, name_af TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '', sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS vendors (
  id TEXT PRIMARY KEY, business_name TEXT NOT NULL, description TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '', whatsapp TEXT NOT NULL DEFAULT '', website TEXT NOT NULL DEFAULT '',
  logo TEXT NOT NULL DEFAULT '', gallery TEXT NOT NULL DEFAULT '[]', featured_image TEXT NOT NULL DEFAULT '',
  category_id TEXT NOT NULL DEFAULT 'other', socials TEXT NOT NULL DEFAULT '[]', is_demo INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS stalls (
  id TEXT PRIMARY KEY, stall_number TEXT NOT NULL, street_name TEXT NOT NULL DEFAULT '',
  x REAL NOT NULL DEFAULT 0, y REAL NOT NULL DEFAULT 0, width REAL NOT NULL DEFAULT 90,
  height REAL NOT NULL DEFAULT 60, rotation REAL NOT NULL DEFAULT 0,
  vendor_id TEXT, category_id TEXT, status TEXT NOT NULL DEFAULT 'open',
  featured_level TEXT NOT NULL DEFAULT 'free', saturday_special INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY, vendor_id TEXT NOT NULL, name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '', price TEXT NOT NULL DEFAULT '', keywords TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS specials (
  id TEXT PRIMARY KEY, vendor_id TEXT NOT NULL, stall_id TEXT NOT NULL, title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '', price TEXT NOT NULL DEFAULT '', normal_price TEXT NOT NULL DEFAULT '',
  image TEXT NOT NULL DEFAULT '', start_date TEXT NOT NULL, end_date TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS pricing (
  id TEXT PRIMARY KEY, tier TEXT NOT NULL, price_zar INTEGER NOT NULL DEFAULT 0,
  features TEXT NOT NULL DEFAULT '[]', active INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS sponsors (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, type TEXT NOT NULL, image TEXT NOT NULL DEFAULT '',
  url TEXT NOT NULL DEFAULT '', active INTEGER NOT NULL DEFAULT 1, category_id TEXT
);
CREATE TABLE IF NOT EXISTS advertisements (
  id TEXT PRIMARY KEY, vendor_id TEXT NOT NULL, type TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'active',
  start_date TEXT NOT NULL DEFAULT '', end_date TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS analytics_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT, type TEXT NOT NULL, ref_id TEXT NOT NULL DEFAULT '',
  keyword TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_products_vendor ON products(vendor_id);
CREATE INDEX IF NOT EXISTS idx_specials_vendor ON specials(vendor_id);
CREATE INDEX IF NOT EXISTS idx_specials_stall ON specials(stall_id);
CREATE INDEX IF NOT EXISTS idx_analytics_type ON analytics_events(type);
`;
function j(s, fallback) {
  try {
    return JSON.parse(s);
  } catch {
    return fallback;
  }
}
async function ensureSchema(db) {
  for (const stmt of SCHEMA_SQL.split(";").map((s) => s.trim()).filter(Boolean)) {
    await db.prepare(stmt).run();
  }
}
async function isEmpty(db) {
  const r = await db.prepare("SELECT COUNT(*) AS c FROM stalls").all();
  return (r.results[0]?.c ?? 0) === 0;
}
async function loadMarketData(db) {
  const [cats, vens, prods, stalls, specs, pricing, sponsors, ads] = await Promise.all([
    db.prepare("SELECT * FROM categories ORDER BY sort_order").all(),
    db.prepare("SELECT * FROM vendors").all(),
    db.prepare("SELECT * FROM products").all(),
    db.prepare("SELECT * FROM stalls ORDER BY sort_order, stall_number").all(),
    db.prepare("SELECT * FROM specials").all(),
    db.prepare("SELECT * FROM pricing").all(),
    db.prepare("SELECT * FROM sponsors").all(),
    db.prepare("SELECT * FROM advertisements").all()
  ]);
  const categories = cats.results.map((r) => ({
    id: r.id,
    nameEn: r.name_en,
    nameAf: r.name_af,
    icon: r.icon,
    sortOrder: r.sort_order
  }));
  const vendors = vens.results.map((r) => ({
    id: r.id,
    businessName: r.business_name,
    description: r.description,
    phone: r.phone,
    whatsapp: r.whatsapp,
    website: r.website,
    logo: r.logo,
    gallery: j(r.gallery, []),
    featuredImage: r.featured_image,
    categoryId: r.category_id,
    socials: j(r.socials, []),
    isDemo: !!r.is_demo
  }));
  const products = prods.results.map((r) => ({
    id: r.id,
    vendorId: r.vendor_id,
    name: r.name,
    description: r.description,
    price: r.price,
    keywords: r.keywords
  }));
  const stallRows = stalls.results.map((r) => ({
    id: r.id,
    stallNumber: r.stall_number,
    streetName: r.street_name,
    x: r.x,
    y: r.y,
    width: r.width,
    height: r.height,
    rotation: r.rotation,
    vendorId: r.vendor_id,
    categoryId: r.category_id,
    status: r.status,
    featuredLevel: r.featured_level,
    saturdaySpecial: !!r.saturday_special,
    sortOrder: r.sort_order
  }));
  const specials = specs.results.map((r) => ({
    id: r.id,
    vendorId: r.vendor_id,
    stallId: r.stall_id,
    title: r.title,
    description: r.description,
    price: r.price,
    normalPrice: r.normal_price,
    image: r.image,
    startDate: r.start_date,
    endDate: r.end_date,
    active: !!r.active
  }));
  const pricingRows = pricing.results.map((r) => ({
    id: r.id,
    tier: r.tier,
    priceZar: r.price_zar,
    features: j(r.features, []),
    active: !!r.active
  }));
  const sponsorRows = sponsors.results.map((r) => ({
    id: r.id,
    name: r.name,
    type: r.type,
    image: r.image,
    url: r.url,
    active: !!r.active,
    categoryId: r.category_id
  }));
  const advertisements = ads.results.map((r) => ({
    id: r.id,
    vendorId: r.vendor_id,
    type: r.type,
    status: r.status,
    startDate: r.start_date,
    endDate: r.end_date
  }));
  return { categories, vendors, products, stalls: stallRows, specials, pricing: pricingRows, sponsors: sponsorRows, advertisements };
}
async function seedIfEmpty(db, seed) {
  if (!await isEmpty(db)) return;
  const stmts = [];
  for (const c of seed.categories) {
    stmts.push(db.prepare("INSERT INTO categories (id,name_en,name_af,icon,sort_order) VALUES (?,?,?,?,?)").bind(c.id, c.nameEn, c.nameAf, c.icon, c.sortOrder));
  }
  for (const v of seed.vendors) {
    stmts.push(db.prepare("INSERT INTO vendors (id,business_name,description,phone,whatsapp,website,logo,gallery,featured_image,category_id,socials,is_demo) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)").bind(
      v.id,
      v.businessName,
      v.description,
      v.phone,
      v.whatsapp,
      v.website,
      v.logo,
      JSON.stringify(v.gallery),
      v.featuredImage,
      v.categoryId,
      JSON.stringify(v.socials),
      v.isDemo ? 1 : 0
    ));
  }
  for (const p of seed.products) {
    stmts.push(db.prepare("INSERT INTO products (id,vendor_id,name,description,price,keywords) VALUES (?,?,?,?,?,?)").bind(p.id, p.vendorId, p.name, p.description, p.price, p.keywords));
  }
  for (const s of seed.stalls) {
    stmts.push(db.prepare("INSERT INTO stalls (id,stall_number,street_name,x,y,width,height,rotation,vendor_id,category_id,status,featured_level,saturday_special,sort_order) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)").bind(
      s.id,
      s.stallNumber,
      s.streetName,
      s.x,
      s.y,
      s.width,
      s.height,
      s.rotation,
      s.vendorId,
      s.categoryId,
      s.status,
      s.featuredLevel,
      s.saturdaySpecial ? 1 : 0,
      s.sortOrder
    ));
  }
  for (const sp of seed.specials) {
    stmts.push(db.prepare("INSERT INTO specials (id,vendor_id,stall_id,title,description,price,normal_price,image,start_date,end_date,active) VALUES (?,?,?,?,?,?,?,?,?,?,?)").bind(
      sp.id,
      sp.vendorId,
      sp.stallId,
      sp.title,
      sp.description,
      sp.price,
      sp.normalPrice,
      sp.image,
      sp.startDate,
      sp.endDate,
      sp.active ? 1 : 0
    ));
  }
  for (const pr of seed.pricing) {
    stmts.push(db.prepare("INSERT INTO pricing (id,tier,price_zar,features,active) VALUES (?,?,?,?,?)").bind(pr.id, pr.tier, pr.priceZar, JSON.stringify(pr.features), pr.active ? 1 : 0));
  }
  for (const s of seed.sponsors) {
    stmts.push(db.prepare("INSERT INTO sponsors (id,name,type,image,url,active,category_id) VALUES (?,?,?,?,?,?,?)").bind(s.id, s.name, s.type, s.image, s.url, s.active ? 1 : 0, s.categoryId));
  }
  for (const a of seed.advertisements) {
    stmts.push(db.prepare("INSERT INTO advertisements (id,vendor_id,type,status,start_date,end_date) VALUES (?,?,?,?,?,?)").bind(a.id, a.vendorId, a.type, a.status, a.startDate, a.endDate));
  }
  await db.batch(stmts);
}

// worker/auth.ts
var encoder = new TextEncoder();
function b64url(bytes) {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
async function hmacKey(secret) {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
}
async function signToken(secret, purpose, ttlSeconds) {
  const exp = Math.floor(Date.now() / 1e3) + ttlSeconds;
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(`${purpose}:${exp}`));
  return `${exp}.${b64url(new Uint8Array(sig))}`;
}
async function verifyToken(secret, purpose, token) {
  if (!token) return false;
  const dot = token.indexOf(".");
  if (dot < 0) return false;
  const expStr = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp * 1e3 < Date.now()) return false;
  const key = await hmacKey(secret);
  const expected = await crypto.subtle.sign("HMAC", key, encoder.encode(`${purpose}:${expStr}`));
  const a = b64url(new Uint8Array(expected));
  if (a.length !== sig.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ sig.charCodeAt(i);
  return diff === 0;
}
function parseCookies(header) {
  const out = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    const k = part.slice(0, eq).trim();
    const v = part.slice(eq + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  }
  return out;
}
function sessionCookie(name, value, maxAge, secure) {
  const base = `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}`;
  return secure ? `${base}; Secure` : base;
}

// shared/categories.ts
var DEMO_CATEGORIES = [
  { id: "food", nameEn: "Food", nameAf: "Kos", icon: "\u{1F37D}\uFE0F", sortOrder: 1 },
  { id: "fresh-produce", nameEn: "Fresh Produce", nameAf: "Vars Produksie", icon: "\u{1F955}", sortOrder: 2 },
  { id: "meat", nameEn: "Meat", nameAf: "Vleis", icon: "\u{1F969}", sortOrder: 3 },
  { id: "baked-goods", nameEn: "Baked Goods", nameAf: "Bakware", icon: "\u{1F956}", sortOrder: 4 },
  { id: "coffee", nameEn: "Coffee", nameAf: "Koffie", icon: "\u2615", sortOrder: 5 },
  { id: "plants", nameEn: "Plants", nameAf: "Plante", icon: "\u{1FAB4}", sortOrder: 6 },
  { id: "clothing", nameEn: "Clothing", nameAf: "Klere", icon: "\u{1F455}", sortOrder: 7 },
  { id: "crafts", nameEn: "Crafts", nameAf: "Handwerk", icon: "\u{1F9F6}", sortOrder: 8 },
  { id: "jewellery", nameEn: "Jewellery", nameAf: "Sierade", icon: "\u{1F48D}", sortOrder: 9 },
  { id: "home", nameEn: "Home", nameAf: "Tuis", icon: "\u{1F3E0}", sortOrder: 10 },
  { id: "services", nameEn: "Services", nameAf: "Dienste", icon: "\u{1F6E0}\uFE0F", sortOrder: 11 },
  { id: "other", nameEn: "Other", nameAf: "Ander", icon: "\u{1F4E6}", sortOrder: 12 }
];

// shared/seed.ts
var XS = [60, 160, 260, 360, 550, 650, 750, 850];
var ROWS_Y = [90, 190, 380, 480];
var STALL_W = 90;
var STALL_H = 60;
function svgPlaceholder(label, bg) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="160" viewBox="0 0 240 160"><rect width="240" height="160" rx="12" fill="${bg}"/><rect x="20" y="96" width="200" height="10" rx="5" fill="rgba(255,255,255,0.35)"/><rect x="20" y="116" width="140" height="10" rx="5" fill="rgba(255,255,255,0.22)"/><text x="120" y="70" font-family="sans-serif" font-size="26" font-weight="700" fill="#ffffff" text-anchor="middle">${label}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
var VENDOR_ROWS = [
  { name: "Karoo Kraal Biltong", category: "meat", desc: "Family biltong recipes from the Karoo. Demo profile.", products: [["Biltong", "R180/kg", "biltong dry wors beef"], ["Dro\xEBwors", "R160/kg", "droewors dro\xEB wors dried sausage"], ["Boerewors", "R120/kg", "boerewors wors sausage grill"], ["Lamb chops", "R150/kg", "lamb chops meat"]], level: "premium", special: "active", specialTitle: "Biltong family pack", specialDesc: "3kg biltong bundle, while stocks last (demo).", specialNormal: "R540", specialPrice: "R450" },
  { name: "Sonblom Bakkerij", category: "baked-goods", desc: "Sunrise breads, cakes and koeksisters. Demo profile.", products: [["Bread loaves", "R35", "bread loaf sourdough"], ["Rusks", "R60", "rusks beskuit buttermilk"], ["Koeksisters", "R12", "koeksister syrup dough"]], level: "featured" },
  { name: "Moreleta Groente & Vrugte", category: "fresh-produce", desc: "Seasonal vegetables and fruit boxes. Demo profile.", products: [["Veg box", "R99", "vegetables veg box greens"], ["Apples", "R30/kg", "apples fruit"], ["Onions", "R20/kg", "onions vegetables"]], level: "promoted", special: "active", specialTitle: "Veg box special", specialDesc: "Large seasonal veg box (demo).", specialNormal: "R120", specialPrice: "R99" },
  { name: "Volmaan Koffie Branders", category: "coffee", desc: "Small-batch coffee roasting. Demo profile.", products: [["Espresso beans 500g", "R120", "coffee beans espresso roast"], ["Filter grind", "R95", "filter coffee ground"], ["Rooibos latte", "R35", "rooibos latte tea drink"]], level: "featured" },
  { name: "Saad & Spruit Kwekery", category: "plants", desc: "Seedlings, herbs and succulents. Demo profile.", products: [["Herb seedlings", "R25", "seedlings herbs basil mint"], ["Succulents", "R40", "succulents plants"], ["Potting mix", "R55", "potting soil mix compost"]], level: "premium" },
  { name: "Denim & Draf Mode", category: "clothing", desc: "Casual wear for the whole family. Demo profile.", products: [["Jeans", "R250", "jeans denim clothing clothes"], ["Summer dress", "R180", "dress clothing clothes"], ["Kids tees", "R70", "kids shirts clothes clothing"]] },
  { name: "Handwerk Huisie", category: "crafts", desc: "Handmade candles, crochet and ceramics. Demo profile.", products: [["Soy candles", "R80", "candles crafts"], ["Crochet blankets", "R350", "crochet blanket crafts"], ["Ceramic mugs", "R90", "ceramic mug pottery crafts"]] },
  { name: "Goud & Glans Juwele", category: "jewellery", desc: "Affordable silver and beaded jewellery. Demo profile.", products: [["Silver rings", "R220", "silver rings jewellery"], ["Beaded necklaces", "R150", "beads necklace jewellery"]], level: "promoted" },
  { name: "Biltong Barak", category: "meat", desc: "Chilli biltong and biltong crisps. Demo profile.", products: [["Chilli biltong", "R190/kg", "biltong chilli spicy"], ["Biltong crisps", "R45", "biltong crisps snack"], ["Dro\xEBwors packs", "R150", "droewors dried sausage"]], level: "featured" },
  { name: "Pannekoek Padstal", category: "food", desc: "Hot pancakes and vetkoek straight off the pan. Demo profile.", products: [["Pancakes", "R15", "pancakes pannekoek syrup"], ["Vetkoek & mince", "R30", "vetkoek mince"], ["Magwenya", "R10", "magwenya fatcake"]], level: "promoted", special: "active", specialTitle: "Pancake 3-for-2", specialDesc: "Buy two pancakes, get one free (demo).", specialNormal: "R45", specialPrice: "R30" },
  { name: "Plaas Tafel Eiers", category: "fresh-produce", desc: "Free-range eggs, duck eggs and raw honey. Demo profile.", products: [["Free-range eggs", "R45/dozen", "eggs free range dozen"], ["Duck eggs", "R60/dozen", "duck eggs"], ["Raw honey", "R75", "honey raw"]], level: "featured", special: "expired", specialTitle: "Egg dozen deal", specialDesc: "Expired demo special.", specialNormal: "R55", specialPrice: "R45" },
  { name: "Espresso Eiland", category: "coffee", desc: "Barista coffee and bakes to go. Demo profile.", products: [["Flat white", "R32", "coffee flat white espresso"], ["Cold brew", "R38", "cold brew coffee"], ["Blueberry muffin", "R28", "muffin baked coffee"]] },
  { name: "Blomme van Moreleta", category: "plants", desc: "Cut flowers and potted plants. Demo profile.", products: [["Cut flowers bunch", "R60", "flowers cut fresh"], ["Potted plants", "R90", "plants potted pot"], ["Bulbs", "R35", "bulbs plants"]], special: "scheduled", specialTitle: "Flower bunch special", specialDesc: "Upcoming demo special.", specialNormal: "R80", specialPrice: "R60" },
  { name: "Beskuit & Co", category: "baked-goods", desc: "Twice-baked rusks in every flavour. Demo profile.", products: [["Buttermilk rusks", "R55", "rusks buttermilk beskuit"], ["Ginger biscuits", "R40", "biscuits ginger"]] },
  { name: "Selfoon Herstel & Sleutels", category: "services", desc: "Screen repairs and key cutting. Demo profile.", products: [["Screen replacement", "R450", "phone screen repair"], ["Key cutting", "R60", "keys cutting remote"]] },
  { name: "Ou Boeke & Antiek", category: "other", desc: "Second-hand books, vinyl and curios. Demo profile.", products: [["Paperbacks", "R30", "books paperback"], ["Vinyl records", "R80", "vinyl records music"], ["Curios", "R50", "curios antiek antique"]] },
  { name: "Skaapvleis & Speserye", category: "meat", desc: "Lamb cuts, biltong and house spice blends. Demo profile.", products: [["Lamb legs", "R160/kg", "lamb meat leg"], ["Biltong bites", "R95", "biltong snack bites"], ["Spice blend", "R45", "spice rub seasoning"], ["Chicken portions", "R90/kg", "chicken meat"]] },
  { name: "Kaas & Konfytmaker", category: "food", desc: "Farmstyle cheese, chutney and preserves. Demo profile.", products: [["Mature cheddar", "R120/kg", "cheese cheddar"], ["Green chutney", "R35", "chutney konfyt"], ["Apricot jam", "R40", "jam apricot preserve"]], level: "promoted", special: "inactive", specialTitle: "Cheese board deal", specialDesc: "Deactivated demo special.", specialNormal: "R150", specialPrice: "R120" },
  { name: "Kruie & Groente Tuin", category: "fresh-produce", desc: "Leafy greens and fresh herbs. Demo profile.", products: [["Spinach bunch", "R15", "spinach vegetables greens"], ["Beetroot", "R20", "beetroot vegetables"], ["Parsley & thyme", "R12", "herbs parsley thyme"]] },
  { name: "Koffie Kar", category: "coffee", desc: "Quick takeaway coffee cart. Demo profile.", products: [["Takeaway coffee", "R28", "coffee takeaway cappuccino"], ["Choco mocha", "R35", "mocha chocolate coffee"]] },
  { name: "Kaktus & Kurk", category: "plants", desc: "Cacti, bonsai and cork bark displays. Demo profile.", products: [["Cacti pots", "R70", "cactus cacti plants"], ["Bonsai starter", "R150", "bonsai tree plants"], ["Cork bark", "R45", "cork bark terrarium"]], level: "featured" },
  { name: "Stof & Stiksels", category: "clothing", desc: "Fabric by the metre and alterations. Demo profile.", products: [["Fabric metre", "R60", "fabric cloth material"], ["Curtains", "R450", "curtains fabric home"], ["Alterations", "R80", "alterations sewing repair"]] },
  { name: "Hout & Draad Werkswinkel", category: "crafts", desc: "Woodwork and wire art pieces. Demo profile.", products: [["Wooden bowls", "R180", "wood bowl turned"], ["Wire animals", "R120", "wire art crafts sculpture"]] },
  { name: "Tafel & Teeklere", category: "home", desc: "Table linen and handmade ceramics. Demo profile.", products: [["Table runner", "R150", "table linen runner"], ["Ceramic bowls", "R110", "ceramic bowl pottery home"]] },
  { name: "Gebraaivleis Grill", category: "food", desc: "Wors rolls and braai packs to go. Demo profile.", products: [["Wors roll", "R40", "wors roll boerewors bun"], ["Braai pack", "R250", "braai pack meat platter"], ["Chicken wings", "R80", "chicken wings grill"]], special: "active", specialTitle: "Wors roll deal", specialDesc: "Two wors rolls and chips (demo).", specialNormal: "R95", specialPrice: "R75" },
  { name: "Brood & Botter Bakery", category: "baked-goods", desc: "Sourdough, rolls and farm butter. Demo profile.", products: [["Sourdough", "R50", "sourdough bread"], ["Rolls 6-pack", "R30", "rolls bread buns"], ["Farm butter", "R45", "butter farm"]], level: "featured" },
  { name: "Vrugte Mark", category: "fresh-produce", desc: "Seasonal fruit and dried fruit. Demo profile.", products: [["Seasonal fruit box", "R110", "fruit box seasonal"], ["Dried mango", "R50", "dried mango fruit snack"]] },
  { name: "Klei & Klein Juwele", category: "jewellery", desc: "Polymer clay earrings and charms. Demo profile.", products: [["Clay earrings", "R80", "earrings clay jewellery"], ["Charms", "R40", "charms jewellery"]] },
  { name: "Framing & Fotos", category: "services", desc: "Photo framing and small prints. Demo profile.", products: [["A3 framing", "R250", "framing photo frame"], ["Photo prints", "R15", "prints photos"]] },
  null,
  // vacant
  null,
  // vacant
  { name: "Slush & Snow", category: "food", desc: "Ice cream and slush drinks. Demo profile.", products: [["Ice cream cone", "R25", "ice cream slush"], ["Slush drink", "R20", "slush drink cold"]], status: "closed" }
];
function addDays(base, days) {
  const d = new Date(base.getTime());
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function buildSeedData(now = /* @__PURE__ */ new Date()) {
  const categories = DEMO_CATEGORIES.map((c) => ({ ...c }));
  const catColor = Object.fromEntries(
    categories.map((c) => [c.id, svgPlaceholder(c.nameEn.slice(0, 2).toUpperCase(), "#3f6b43")])
  );
  const vendors = [];
  const products = [];
  const stalls = [];
  const specials = [];
  const advertisements = [];
  VENDOR_ROWS.forEach((row, i) => {
    const rowIdx = Math.floor(i / XS.length);
    const colIdx = i % XS.length;
    const number = String((rowIdx + 1) * 100 + (colIdx + 1));
    const streetName = ["Moreleta St", "Olienhoutlaan", "Olienhoutlaan", "Wilgerlaan"][rowIdx];
    const stallId = `stall-${number}`;
    if (!row) {
      stalls.push({
        id: stallId,
        stallNumber: number,
        streetName,
        x: XS[colIdx],
        y: ROWS_Y[rowIdx],
        width: STALL_W,
        height: STALL_H,
        rotation: 0,
        vendorId: null,
        categoryId: null,
        status: "vacant",
        featuredLevel: "free",
        saturdaySpecial: false,
        sortOrder: i
      });
      return;
    }
    const vendorId = `vendor-${number}`;
    vendors.push({
      id: vendorId,
      businessName: row.name,
      description: row.desc,
      phone: `072 000 ${number.padStart(4, "0")}`,
      whatsapp: `072 000 ${number.padStart(4, "0")}`,
      website: "",
      logo: svgPlaceholder(row.name.slice(0, 2).toUpperCase(), "#5b7f52"),
      gallery: [catColor[row.category], svgPlaceholder("DEMO", "#7a6a4f")],
      featuredImage: catColor[row.category],
      categoryId: row.category,
      socials: [],
      isDemo: true
    });
    row.products.forEach((p, pi) => {
      products.push({
        id: `prod-${number}-${pi}`,
        vendorId,
        name: p[0],
        description: "",
        price: p[1],
        keywords: p[2]
      });
    });
    stalls.push({
      id: stallId,
      stallNumber: number,
      streetName,
      x: XS[colIdx],
      y: ROWS_Y[rowIdx],
      width: STALL_W,
      height: STALL_H,
      rotation: 0,
      vendorId,
      categoryId: row.category,
      status: row.status === "closed" ? "closed" : "open",
      featuredLevel: row.level ?? "free",
      saturdaySpecial: row.special === "active",
      sortOrder: i
    });
    if (row.level) {
      advertisements.push({
        id: `ad-${number}`,
        vendorId,
        type: row.level,
        status: "active",
        startDate: addDays(now, -30),
        endDate: addDays(now, 60)
      });
    }
    if (row.special) {
      const ranges = {
        active: [addDays(now, -1), addDays(now, 5), true],
        expired: [addDays(now, -10), addDays(now, -3), true],
        scheduled: [addDays(now, 3), addDays(now, 10), true],
        inactive: [addDays(now, -1), addDays(now, 5), false]
      };
      const [startDate, endDate, active] = ranges[row.special];
      specials.push({
        id: `special-${number}`,
        vendorId,
        stallId,
        title: row.specialTitle ?? `${row.name} special`,
        description: row.specialDesc ?? "",
        price: row.specialPrice ?? "",
        normalPrice: row.specialNormal ?? "",
        image: catColor[row.category],
        startDate,
        endDate,
        active
      });
    }
  });
  const pricing = [
    { id: "price-free", tier: "free", priceZar: 0, features: ["Stall number", "Business name", "Basic category", "Basic product list"], active: true },
    { id: "price-featured", tier: "featured", priceZar: 50, features: ["Expanded profile", "Business logo", "Contact buttons", "Photo", "Priority listing"], active: true },
    { id: "price-promoted", tier: "promoted", priceZar: 100, features: ["Higher in search results", "Special badge", "Specials section"], active: true },
    { id: "price-premium", tier: "premium", priceZar: 200, features: ["Enhanced map marker", "Homepage feature area", "Larger vendor card", "Multiple images"], active: true },
    { id: "price-saturday", tier: "saturday_special", priceZar: 30, features: ["Saturday special listing", "Special indicator on map"], active: true },
    { id: "price-category", tier: "category_sponsor", priceZar: 750, features: ["Sponsor label within one category"], active: true },
    { id: "price-map", tier: "map_sponsor", priceZar: 2e3, features: ["Subtle sponsor placement near the map"], active: true }
  ];
  const sponsors = [
    { id: "sponsor-green", name: "Green Fingers Demo Sponsor", type: "category", image: catColor["plants"], url: "", active: true, categoryId: "plants" },
    { id: "sponsor-map", name: "Main Map Demo Sponsor", type: "map", image: catColor["food"], url: "", active: true, categoryId: null },
    { id: "sponsor-off", name: "Inactive Demo Sponsor", type: "category", image: catColor["home"], url: "", active: false, categoryId: "home" }
  ];
  return { categories, vendors, products, stalls, specials, pricing, sponsors, advertisements };
}

// worker/index.ts
var app = new Hono3();
var booted = null;
async function boot(env) {
  if (!env.DB) return;
  if (!booted) {
    booted = (async () => {
      await ensureSchema(env.DB);
      await seedIfEmpty(env.DB, buildSeedData(/* @__PURE__ */ new Date()));
    })();
  }
  await booted;
}
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" }
  });
}
var MAX_IMAGE_LEN = 2e5;
var DATA_URL_RE = /^data:image\/(png|jpeg|jpg|webp|gif|svg\+xml);base64,[A-Za-z0-9+/=]+$/;
function clean(v, max) {
  if (typeof v !== "string") return "";
  return v.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, max);
}
function imageOk(v) {
  if (typeof v !== "string") return "";
  if (v === "") return "";
  if (v.length > MAX_IMAGE_LEN) return "";
  if (DATA_URL_RE.test(v)) return v;
  if (/^https?:\/\/[^\s"']+$/i.test(v)) return v;
  return "";
}
function bool(v) {
  return v === true || v === "true" || v === 1 || v === "1";
}
function num(v, min, max, fallback) {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}
function requireFields(b, fields) {
  for (const f of fields) {
    if (clean(b[f], 500) === "") return f;
  }
  return null;
}
app.get("/api/health", () => json({ ok: true }));
app.post("/api/login", async (c) => {
  const b = await c.req.json().catch(() => ({ password: "" }));
  const pw = typeof b.password === "string" ? b.password : "";
  if (!pw || pw !== c.env.ACCESS_PASSWORD) {
    return json({ error: "bad_password" }, 401);
  }
  const token = await signToken(c.env.SESSION_SECRET, "viewer", 60 * 60 * 24 * 30);
  const secure = new URL(c.req.url).protocol === "https:";
  return new Response(JSON.stringify({ ok: true }), {
    headers: {
      "content-type": "application/json",
      "set-cookie": sessionCookie("bm_session", token, 60 * 60 * 24 * 30, secure),
      "cache-control": "no-store"
    }
  });
});
app.post("/api/logout", (c) => {
  const secure = new URL(c.req.url).protocol === "https:";
  return new Response(JSON.stringify({ ok: true }), {
    headers: {
      "content-type": "application/json",
      "set-cookie": sessionCookie("bm_session", "", 0, secure),
      "cache-control": "no-store"
    }
  });
});
async function requireViewer(c) {
  const cookies = parseCookies(c.req.header("cookie"));
  const ok = await verifyToken(c.env.SESSION_SECRET, "viewer", cookies.bm_session);
  return ok ? null : json({ error: "unauthorized" }, 401);
}
async function requireAdmin(c) {
  const cookies = parseCookies(c.req.header("cookie"));
  const ok = await verifyToken(c.env.SESSION_SECRET, "admin", cookies.bm_admin);
  if (!ok) return json({ error: "unauthorized" }, 401);
  c.set("admin", true);
  return null;
}
function originOk(req) {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === new URL(req.url).host;
  } catch {
    return false;
  }
}
var adminApi = new Hono3();
adminApi.use("*", async (c, next) => {
  const p = c.req.path;
  if (p.endsWith("/api/admin/login") || p.endsWith("/api/admin/logout")) {
    await next();
    return;
  }
  if (!originOk(c.req.raw)) return json({ error: "bad_origin" }, 403);
  const guard = await requireAdmin(c);
  if (guard) return guard;
  await next();
});
adminApi.post("/login", async (c) => {
  const b = await c.req.json().catch(() => ({ password: "" }));
  const pw = typeof b.password === "string" ? b.password : "";
  if (!pw || pw !== c.env.ADMIN_PASSWORD) return json({ error: "bad_password" }, 401);
  const token = await signToken(c.env.SESSION_SECRET, "admin", 60 * 60 * 12);
  const secure = new URL(c.req.url).protocol === "https:";
  return new Response(JSON.stringify({ ok: true }), {
    headers: {
      "content-type": "application/json",
      "set-cookie": sessionCookie("bm_admin", token, 60 * 60 * 12, secure),
      "cache-control": "no-store"
    }
  });
});
adminApi.post("/logout", (c) => {
  const secure = new URL(c.req.url).protocol === "https:";
  return new Response(JSON.stringify({ ok: true }), {
    headers: {
      "content-type": "application/json",
      "set-cookie": sessionCookie("bm_admin", "", 0, secure),
      "cache-control": "no-store"
    }
  });
});
adminApi.get("/session", () => json({ admin: true }));
var dataRoute = new Hono3();
dataRoute.get("/", async (c) => {
  await boot(c.env);
  const guard = await requireViewer(c);
  if (guard) return guard;
  const data = await loadMarketData(c.env.DB);
  return json({ ok: true, data });
});
app.route("/api/data", dataRoute);
var ALLOWED_EVENTS = /* @__PURE__ */ new Set([
  "search",
  "profile_view",
  "stall_locate",
  "whatsapp_click",
  "call_click",
  "category_click",
  "special_view",
  "pwa_install"
]);
var analyticsRoute = new Hono3();
analyticsRoute.post("/", async (c) => {
  await boot(c.env);
  const guard = await requireViewer(c);
  if (guard) return guard;
  const b = await c.req.json().catch(() => ({}));
  const type = typeof b.type === "string" ? b.type : "";
  if (!ALLOWED_EVENTS.has(type)) return json({ error: "bad_type" }, 400);
  const refId = clean(b.refId, 80);
  const keyword = clean(b.keyword, 80).toLowerCase();
  await c.env.DB.prepare("INSERT INTO analytics_events (type, ref_id, keyword) VALUES (?,?,?)").bind(type, refId, keyword).run();
  return json({ ok: true });
});
app.route("/api/analytics", analyticsRoute);
adminApi.get("/stalls", async (c) => {
  await boot(c.env);
  const data = await loadMarketData(c.env.DB);
  return json({ ok: true, stalls: data.stalls });
});
adminApi.post("/stalls", async (c) => {
  await boot(c.env);
  const b = await c.req.json().catch(() => ({}));
  const missing = requireFields(b, ["stallNumber"]);
  if (missing) return json({ error: `missing:${missing}` }, 400);
  const stallNumber = clean(b.stallNumber, 20);
  const dupe = await c.env.DB.prepare("SELECT id FROM stalls WHERE stall_number = ?").bind(stallNumber).all();
  if (dupe.results.length > 0) return json({ error: "duplicate_number" }, 409);
  const id = clean(b.id, 60) || `stall-${stallNumber}-${Math.random().toString(36).slice(2, 6)}`;
  const status = ["open", "vacant", "closed"].includes(String(b.status)) ? String(b.status) : "open";
  const level = ["free", "featured", "promoted", "premium"].includes(String(b.featuredLevel)) ? String(b.featuredLevel) : "free";
  await c.env.DB.prepare(
    "INSERT INTO stalls (id,stall_number,street_name,x,y,width,height,rotation,vendor_id,category_id,status,featured_level,saturday_special,sort_order) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)"
  ).bind(
    id,
    stallNumber,
    clean(b.streetName, 80),
    num(b.x, 0, 2e4, 0),
    num(b.y, 0, 2e4, 0),
    num(b.width, 10, 2e3, 90),
    num(b.height, 10, 2e3, 60),
    num(b.rotation, -360, 360, 0),
    clean(b.vendorId, 60) || null,
    clean(b.categoryId, 60) || null,
    status,
    level,
    bool(b.saturdaySpecial) ? 1 : 0,
    num(b.sortOrder, 0, 1e5, 0)
  ).run();
  return json({ ok: true, id });
});
adminApi.put("/stalls/:id", async (c) => {
  await boot(c.env);
  const id = c.req.param("id");
  const b = await c.req.json().catch(() => ({}));
  const existing = await c.env.DB.prepare("SELECT * FROM stalls WHERE id = ?").bind(id).all();
  const row = existing.results[0];
  if (!row) return json({ error: "not_found" }, 404);
  if (b.stallNumber !== void 0) {
    const n = clean(b.stallNumber, 20);
    if (!n) return json({ error: "missing:stallNumber" }, 400);
    const dupe = await c.env.DB.prepare("SELECT id FROM stalls WHERE stall_number = ? AND id != ?").bind(n, id).all();
    if (dupe.results.length > 0) return json({ error: "duplicate_number" }, 409);
  }
  const status = ["open", "vacant", "closed"].includes(String(b.status)) ? String(b.status) : String(row.status);
  const level = ["free", "featured", "promoted", "premium"].includes(String(b.featuredLevel)) ? String(b.featuredLevel) : String(row.featured_level);
  await c.env.DB.prepare(
    "UPDATE stalls SET stall_number=?, street_name=?, x=?, y=?, width=?, height=?, rotation=?, vendor_id=?, category_id=?, status=?, featured_level=?, saturday_special=?, sort_order=? WHERE id=?"
  ).bind(
    b.stallNumber === void 0 ? String(row.stall_number) : clean(b.stallNumber, 20),
    b.streetName === void 0 ? String(row.street_name) : clean(b.streetName, 80),
    b.x === void 0 ? row.x : num(b.x, 0, 2e4, Number(row.x)),
    b.y === void 0 ? row.y : num(b.y, 0, 2e4, Number(row.y)),
    b.width === void 0 ? row.width : num(b.width, 10, 2e3, Number(row.width)),
    b.height === void 0 ? row.height : num(b.height, 10, 2e3, Number(row.height)),
    b.rotation === void 0 ? row.rotation : num(b.rotation, -360, 360, Number(row.rotation)),
    b.vendorId === void 0 ? row.vendor_id : clean(b.vendorId, 60) || null,
    b.categoryId === void 0 ? row.category_id : clean(b.categoryId, 60) || null,
    status,
    level,
    b.saturdaySpecial === void 0 ? row.saturday_special ? 1 : 0 : bool(b.saturdaySpecial) ? 1 : 0,
    b.sortOrder === void 0 ? row.sort_order : num(b.sortOrder, 0, 1e5, Number(row.sort_order)),
    id
  ).run();
  return json({ ok: true });
});
adminApi.delete("/stalls/:id", async (c) => {
  await boot(c.env);
  await c.env.DB.prepare("DELETE FROM stalls WHERE id = ?").bind(c.req.param("id")).run();
  return json({ ok: true });
});
adminApi.post("/vendors", async (c) => {
  await boot(c.env);
  const b = await c.req.json().catch(() => ({}));
  const missing = requireFields(b, ["businessName", "categoryId"]);
  if (missing) return json({ error: `missing:${missing}` }, 400);
  const id = clean(b.id, 60) || `vendor-${Math.random().toString(36).slice(2, 10)}`;
  const gallery = Array.isArray(b.gallery) ? b.gallery.slice(0, 8).map((g) => imageOk(g)).filter(Boolean) : [];
  const socials = Array.isArray(b.socials) ? b.socials.slice(0, 6).map((s) => ({ label: clean(s.label, 40), url: clean(s.url, 300) })).filter((s) => s.label && /^https?:\/\//.test(s.url)) : [];
  await c.env.DB.prepare(
    "INSERT INTO vendors (id,business_name,description,phone,whatsapp,website,logo,gallery,featured_image,category_id,socials,is_demo) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)"
  ).bind(
    id,
    clean(b.businessName, 120),
    clean(b.description, 2e3),
    clean(b.phone, 40),
    clean(b.whatsapp, 40),
    clean(b.website, 300),
    imageOk(b.logo),
    JSON.stringify(gallery),
    imageOk(b.featuredImage),
    clean(b.categoryId, 60),
    JSON.stringify(socials),
    bool(b.isDemo) ? 1 : 0
  ).run();
  return json({ ok: true, id });
});
adminApi.put("/vendors/:id", async (c) => {
  await boot(c.env);
  const id = c.req.param("id");
  const b = await c.req.json().catch(() => ({}));
  const existing = await c.env.DB.prepare("SELECT * FROM vendors WHERE id = ?").bind(id).all();
  const row = existing.results[0];
  if (!row) return json({ error: "not_found" }, 404);
  const gallery = Array.isArray(b.gallery) ? b.gallery.slice(0, 8).map((g) => imageOk(g)).filter(Boolean) : JSON.parse(String(row.gallery || "[]"));
  const socials = Array.isArray(b.socials) ? b.socials.slice(0, 6).map((s) => ({ label: clean(s.label, 40), url: clean(s.url, 300) })).filter((s) => s.label && /^https?:\/\//.test(s.url)) : JSON.parse(String(row.socials || "[]"));
  await c.env.DB.prepare(
    "UPDATE vendors SET business_name=?, description=?, phone=?, whatsapp=?, website=?, logo=?, gallery=?, featured_image=?, category_id=?, socials=?, is_demo=? WHERE id=?"
  ).bind(
    b.businessName === void 0 ? String(row.business_name) : clean(b.businessName, 120),
    b.description === void 0 ? String(row.description) : clean(b.description, 2e3),
    b.phone === void 0 ? String(row.phone) : clean(b.phone, 40),
    b.whatsapp === void 0 ? String(row.whatsapp) : clean(b.whatsapp, 40),
    b.website === void 0 ? String(row.website) : clean(b.website, 300),
    b.logo === void 0 ? String(row.logo) : imageOk(b.logo),
    JSON.stringify(gallery),
    b.featuredImage === void 0 ? String(row.featured_image) : imageOk(b.featuredImage),
    b.categoryId === void 0 ? String(row.category_id) : clean(b.categoryId, 60),
    JSON.stringify(socials),
    b.isDemo === void 0 ? row.is_demo ? 1 : 0 : bool(b.isDemo) ? 1 : 0,
    id
  ).run();
  return json({ ok: true });
});
adminApi.delete("/vendors/:id", async (c) => {
  await boot(c.env);
  const id = c.req.param("id");
  const db = c.env.DB;
  await db.batch([
    db.prepare("DELETE FROM products WHERE vendor_id = ?").bind(id),
    db.prepare("DELETE FROM specials WHERE vendor_id = ?").bind(id),
    db.prepare("DELETE FROM advertisements WHERE vendor_id = ?").bind(id),
    db.prepare("UPDATE stalls SET vendor_id = NULL, status = ? WHERE vendor_id = ?").bind("vacant", id),
    db.prepare("DELETE FROM vendors WHERE id = ?").bind(id)
  ]);
  return json({ ok: true });
});
adminApi.post("/products", async (c) => {
  await boot(c.env);
  const b = await c.req.json().catch(() => ({}));
  const missing = requireFields(b, ["vendorId", "name"]);
  if (missing) return json({ error: `missing:${missing}` }, 400);
  const vendorId = clean(b.vendorId, 60);
  const vend = await c.env.DB.prepare("SELECT id FROM vendors WHERE id = ?").bind(vendorId).all();
  if (vend.results.length === 0) return json({ error: "bad_vendor" }, 400);
  const id = clean(b.id, 60) || `prod-${Math.random().toString(36).slice(2, 10)}`;
  await c.env.DB.prepare("INSERT INTO products (id,vendor_id,name,description,price,keywords) VALUES (?,?,?,?,?,?)").bind(id, vendorId, clean(b.name, 120), clean(b.description, 1e3), clean(b.price, 40), clean(b.keywords, 400)).run();
  return json({ ok: true, id });
});
adminApi.put("/products/:id", async (c) => {
  await boot(c.env);
  const id = c.req.param("id");
  const b = await c.req.json().catch(() => ({}));
  const existing = await c.env.DB.prepare("SELECT * FROM products WHERE id = ?").bind(id).all();
  const row = existing.results[0];
  if (!row) return json({ error: "not_found" }, 404);
  await c.env.DB.prepare("UPDATE products SET name=?, description=?, price=?, keywords=? WHERE id=?").bind(
    b.name === void 0 ? String(row.name) : clean(b.name, 120),
    b.description === void 0 ? String(row.description) : clean(b.description, 1e3),
    b.price === void 0 ? String(row.price) : clean(b.price, 40),
    b.keywords === void 0 ? String(row.keywords) : clean(b.keywords, 400),
    id
  ).run();
  return json({ ok: true });
});
adminApi.delete("/products/:id", async (c) => {
  await boot(c.env);
  await c.env.DB.prepare("DELETE FROM products WHERE id = ?").bind(c.req.param("id")).run();
  return json({ ok: true });
});
adminApi.post("/categories", async (c) => {
  await boot(c.env);
  const b = await c.req.json().catch(() => ({}));
  const missing = requireFields(b, ["nameEn"]);
  if (missing) return json({ error: `missing:${missing}` }, 400);
  const id = clean(b.id, 60).toLowerCase().replace(/[^a-z0-9-]/g, "") || `cat-${Math.random().toString(36).slice(2, 8)}`;
  const dupe = await c.env.DB.prepare("SELECT id FROM categories WHERE id = ?").bind(id).all();
  if (dupe.results.length > 0) return json({ error: "duplicate_id" }, 409);
  await c.env.DB.prepare("INSERT INTO categories (id,name_en,name_af,icon,sort_order) VALUES (?,?,?,?,?)").bind(id, clean(b.nameEn, 60), clean(b.nameAf, 60) || clean(b.nameEn, 60), clean(b.icon, 8), num(b.sortOrder, 0, 999, 99)).run();
  return json({ ok: true, id });
});
adminApi.put("/categories/:id", async (c) => {
  await boot(c.env);
  const id = c.req.param("id");
  const b = await c.req.json().catch(() => ({}));
  const existing = await c.env.DB.prepare("SELECT * FROM categories WHERE id = ?").bind(id).all();
  const row = existing.results[0];
  if (!row) return json({ error: "not_found" }, 404);
  await c.env.DB.prepare("UPDATE categories SET name_en=?, name_af=?, icon=?, sort_order=? WHERE id=?").bind(
    b.nameEn === void 0 ? String(row.name_en) : clean(b.nameEn, 60),
    b.nameAf === void 0 ? String(row.name_af) : clean(b.nameAf, 60),
    b.icon === void 0 ? String(row.icon) : clean(b.icon, 8),
    b.sortOrder === void 0 ? row.sort_order : num(b.sortOrder, 0, 999, Number(row.sort_order)),
    id
  ).run();
  return json({ ok: true });
});
adminApi.delete("/categories/:id", async (c) => {
  await boot(c.env);
  const id = c.req.param("id");
  const used = await c.env.DB.prepare("SELECT COUNT(*) AS c FROM vendors WHERE category_id = ?").bind(id).all();
  if ((used.results[0]?.c ?? 0) > 0) return json({ error: "in_use" }, 409);
  await c.env.DB.prepare("DELETE FROM categories WHERE id = ?").bind(id).run();
  return json({ ok: true });
});
adminApi.get("/specials", async (c) => {
  await boot(c.env);
  const data = await loadMarketData(c.env.DB);
  return json({ ok: true, specials: data.specials });
});
adminApi.post("/specials", async (c) => {
  await boot(c.env);
  const b = await c.req.json().catch(() => ({}));
  const missing = requireFields(b, ["vendorId", "stallId", "title", "startDate", "endDate"]);
  if (missing) return json({ error: `missing:${missing}` }, 400);
  const start = clean(b.startDate, 10);
  const end = clean(b.endDate, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end) || end < start) {
    return json({ error: "bad_dates" }, 400);
  }
  const stallId = clean(b.stallId, 60);
  const stall = await c.env.DB.prepare("SELECT id FROM stalls WHERE id = ?").bind(stallId).all();
  if (stall.results.length === 0) return json({ error: "bad_stall" }, 400);
  const id = clean(b.id, 60) || `special-${Math.random().toString(36).slice(2, 10)}`;
  await c.env.DB.prepare(
    "INSERT INTO specials (id,vendor_id,stall_id,title,description,price,normal_price,image,start_date,end_date,active) VALUES (?,?,?,?,?,?,?,?,?,?,?)"
  ).bind(
    id,
    clean(b.vendorId, 60),
    stallId,
    clean(b.title, 120),
    clean(b.description, 1e3),
    clean(b.price, 40),
    clean(b.normalPrice, 40),
    imageOk(b.image),
    start,
    end,
    bool(b.active) ? 1 : 0
  ).run();
  return json({ ok: true, id });
});
adminApi.put("/specials/:id", async (c) => {
  await boot(c.env);
  const id = c.req.param("id");
  const b = await c.req.json().catch(() => ({}));
  const existing = await c.env.DB.prepare("SELECT * FROM specials WHERE id = ?").bind(id).all();
  const row = existing.results[0];
  if (!row) return json({ error: "not_found" }, 404);
  const start = b.startDate === void 0 ? String(row.start_date) : clean(b.startDate, 10);
  const end = b.endDate === void 0 ? String(row.end_date) : clean(b.endDate, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end) || end < start) {
    return json({ error: "bad_dates" }, 400);
  }
  const newStallId = b.stallId === void 0 ? String(row.stall_id) : clean(b.stallId, 60);
  if (b.stallId !== void 0) {
    const st = await c.env.DB.prepare("SELECT id FROM stalls WHERE id = ?").bind(newStallId).all();
    if (st.results.length === 0) return json({ error: "bad_stall" }, 400);
  }
  const newVendorId = b.vendorId === void 0 ? String(row.vendor_id) : clean(b.vendorId, 60);
  await c.env.DB.prepare(
    "UPDATE specials SET vendor_id=?, stall_id=?, title=?, description=?, price=?, normal_price=?, image=?, start_date=?, end_date=?, active=? WHERE id=?"
  ).bind(
    newVendorId,
    newStallId,
    b.title === void 0 ? String(row.title) : clean(b.title, 120),
    b.description === void 0 ? String(row.description) : clean(b.description, 1e3),
    b.price === void 0 ? String(row.price) : clean(b.price, 40),
    b.normalPrice === void 0 ? String(row.normal_price) : clean(b.normalPrice, 40),
    b.image === void 0 ? String(row.image) : imageOk(b.image),
    start,
    end,
    b.active === void 0 ? row.active ? 1 : 0 : bool(b.active) ? 1 : 0,
    id
  ).run();
  return json({ ok: true });
});
adminApi.delete("/specials/:id", async (c) => {
  await boot(c.env);
  await c.env.DB.prepare("DELETE FROM specials WHERE id = ?").bind(c.req.param("id")).run();
  return json({ ok: true });
});
adminApi.put("/pricing/:id", async (c) => {
  await boot(c.env);
  const id = c.req.param("id");
  const b = await c.req.json().catch(() => ({}));
  const existing = await c.env.DB.prepare("SELECT * FROM pricing WHERE id = ?").bind(id).all();
  const row = existing.results[0];
  if (!row) return json({ error: "not_found" }, 404);
  const features = Array.isArray(b.features) ? b.features.slice(0, 12).map((f) => clean(f, 120)).filter(Boolean) : JSON.parse(String(row.features || "[]"));
  await c.env.DB.prepare("UPDATE pricing SET price_zar=?, features=?, active=? WHERE id=?").bind(
    b.priceZar === void 0 ? row.price_zar : num(b.priceZar, 0, 1e6, Number(row.price_zar) || 0),
    JSON.stringify(features),
    b.active === void 0 ? row.active ? 1 : 0 : bool(b.active) ? 1 : 0,
    id
  ).run();
  return json({ ok: true });
});
adminApi.post("/sponsors", async (c) => {
  await boot(c.env);
  const b = await c.req.json().catch(() => ({}));
  const missing = requireFields(b, ["name", "type"]);
  if (missing) return json({ error: `missing:${missing}` }, 400);
  const type = b.type === "map" ? "map" : "category";
  const id = clean(b.id, 60) || `sponsor-${Math.random().toString(36).slice(2, 10)}`;
  await c.env.DB.prepare("INSERT INTO sponsors (id,name,type,image,url,active,category_id) VALUES (?,?,?,?,?,?,?)").bind(id, clean(b.name, 120), type, imageOk(b.image), clean(b.url, 300), bool(b.active) ? 1 : 0, clean(b.categoryId, 60) || null).run();
  return json({ ok: true, id });
});
adminApi.put("/sponsors/:id", async (c) => {
  await boot(c.env);
  const id = c.req.param("id");
  const b = await c.req.json().catch(() => ({}));
  const existing = await c.env.DB.prepare("SELECT * FROM sponsors WHERE id = ?").bind(id).all();
  const row = existing.results[0];
  if (!row) return json({ error: "not_found" }, 404);
  await c.env.DB.prepare("UPDATE sponsors SET name=?, type=?, image=?, url=?, active=?, category_id=? WHERE id=?").bind(
    b.name === void 0 ? String(row.name) : clean(b.name, 120),
    b.type === "map" || b.type === "category" ? b.type : String(row.type),
    b.image === void 0 ? String(row.image) : imageOk(b.image),
    b.url === void 0 ? String(row.url) : clean(b.url, 300),
    b.active === void 0 ? row.active ? 1 : 0 : bool(b.active) ? 1 : 0,
    b.categoryId === void 0 ? row.category_id : clean(b.categoryId, 60) || null,
    id
  ).run();
  return json({ ok: true });
});
adminApi.delete("/sponsors/:id", async (c) => {
  await boot(c.env);
  await c.env.DB.prepare("DELETE FROM sponsors WHERE id = ?").bind(c.req.param("id")).run();
  return json({ ok: true });
});
adminApi.get("/analytics", async (c) => {
  await boot(c.env);
  const db = c.env.DB;
  const [topSearches, viewedStalls, popularCategories, specialClicks, totals] = await Promise.all([
    db.prepare("SELECT keyword, COUNT(*) AS count FROM analytics_events WHERE type='search' AND keyword != '' GROUP BY keyword ORDER BY count DESC LIMIT 20").all(),
    db.prepare("SELECT ref_id, COUNT(*) AS count FROM analytics_events WHERE type='profile_view' AND ref_id != '' GROUP BY ref_id ORDER BY count DESC LIMIT 20").all(),
    db.prepare("SELECT ref_id, COUNT(*) AS count FROM analytics_events WHERE type='category_click' AND ref_id != '' GROUP BY ref_id ORDER BY count DESC LIMIT 20").all(),
    db.prepare("SELECT ref_id, COUNT(*) AS count FROM analytics_events WHERE type='special_view' AND ref_id != '' GROUP BY ref_id ORDER BY count DESC LIMIT 20").all(),
    db.prepare("SELECT type, COUNT(*) AS count FROM analytics_events GROUP BY type").all()
  ]);
  const levelRows = await db.prepare(
    `SELECT s.featured_level AS level, COUNT(*) AS count
     FROM analytics_events e JOIN stalls s ON s.id = e.ref_id
     WHERE e.type='profile_view' GROUP BY s.featured_level`
  ).all();
  const stallNumbers = /* @__PURE__ */ new Map();
  const st = await db.prepare("SELECT id, stall_number, vendor_id FROM stalls").all();
  const vendorNames = /* @__PURE__ */ new Map();
  const vn = await db.prepare("SELECT id, business_name FROM vendors").all();
  for (const v of vn.results) vendorNames.set(v.id, v.business_name);
  for (const s of st.results) {
    stallNumbers.set(s.id, s.vendor_id ? `${s.stall_number} \u2013 ${vendorNames.get(s.vendor_id) ?? ""}` : s.stall_number);
  }
  const categoryNames = /* @__PURE__ */ new Map();
  const cn = await db.prepare("SELECT id, name_en FROM categories").all();
  for (const c2 of cn.results) categoryNames.set(c2.id, c2.name_en);
  return json({
    ok: true,
    analytics: {
      topSearches: topSearches.results,
      mostViewedStalls: viewedStalls.results.map((r) => ({ label: stallNumbers.get(r.ref_id) ?? r.ref_id, count: r.count })),
      popularCategories: popularCategories.results.map((r) => ({ label: categoryNames.get(r.ref_id) ?? r.ref_id, count: r.count })),
      specialClicks: specialClicks.results.map((r) => ({ label: r.ref_id, count: r.count })),
      featuredPerformance: levelRows.results.map((r) => ({ label: r.level, count: r.count })),
      totals: totals.results
    }
  });
});
adminApi.post("/reset-demo", async (c) => {
  await boot(c.env);
  const db = c.env.DB;
  await db.batch([
    db.prepare("DELETE FROM specials"),
    db.prepare("DELETE FROM products"),
    db.prepare("DELETE FROM advertisements"),
    db.prepare("DELETE FROM stalls"),
    db.prepare("DELETE FROM vendors"),
    db.prepare("DELETE FROM categories"),
    db.prepare("DELETE FROM pricing"),
    db.prepare("DELETE FROM sponsors")
  ]);
  await seedIfEmpty(db, buildSeedData(/* @__PURE__ */ new Date()));
  return json({ ok: true });
});
app.route("/api/admin", adminApi);
var LOGIN_PAGE = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"/>
<meta name="robots" content="noindex, nofollow"/>
<meta name="theme-color" content="#1b5e20"/>
<title>Private Market Map Demo</title>
<style>
*{box-sizing:border-box}body{margin:0;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;background:#132a16;color:#eef5ee;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}
.card{background:#1d3a21;border:1px solid #2f5a35;border-radius:16px;padding:28px 24px;max-width:380px;width:100%}
h1{font-size:1.25rem;margin:0 0 4px}p.sub{color:#b9d4ba;font-size:.9rem;margin:0 0 20px}
label{display:block;font-size:.85rem;margin-bottom:6px;color:#cfe6d0}
input{width:100%;padding:14px;border-radius:10px;border:1px solid #3c6b42;background:#12250f;color:#fff;font-size:1rem;margin-bottom:16px}
button{width:100%;padding:14px;border-radius:10px;border:0;background:#2e7d32;color:#fff;font-size:1rem;font-weight:600;cursor:pointer}
button:active{background:#256628}
.err{color:#ffb4a8;font-size:.85rem;margin:0 0 12px;display:none}
.foot{color:#8fae91;font-size:.75rem;text-align:center;margin-top:18px;line-height:1.4}
</style></head><body>
<div class="card">
<h1>Private Market Map Demo</h1>
<p class="sub">Private independent prototype. Enter the access password to continue.</p>
<p class="err" id="err"></p>
<label for="pw">Password</label>
<input id="pw" type="password" autocomplete="current-password"/>
<button id="btn">Unlock</button>
<p class="foot">Private independent prototype.<br/>Not affiliated with or endorsed by Pretoria Boeremark.</p>
</div>
<script>
document.getElementById('btn').addEventListener('click', go);
document.getElementById('pw').addEventListener('keydown', function(e){ if(e.key==='Enter') go(); });
function go(){
  var pw = document.getElementById('pw').value;
  fetch('/api/login', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({password: pw})})
    .then(function(r){ if(!r.ok) throw new Error('bad'); location.reload(); })
    .catch(function(){ var e=document.getElementById('err'); e.textContent='Incorrect password. Please try again.'; e.style.display='block'; });
}
</script>
</body></html>`;
app.get("/robots.txt", () => new Response("User-agent: *\nDisallow: /\n", {
  headers: { "content-type": "text/plain", "x-robots-tag": "noindex, nofollow" }
}));
app.notFound(async (c) => {
  const accept = c.req.header("accept") ?? "";
  const isHtml = c.req.method === "GET" && accept.includes("text/html");
  const cookies = parseCookies(c.req.header("cookie"));
  const viewer = await verifyToken(c.env.SESSION_SECRET, "viewer", cookies.bm_session);
  if (!viewer) {
    if (isHtml) {
      return new Response(LOGIN_PAGE, {
        status: 200,
        headers: {
          "content-type": "text/html; charset=utf-8",
          "cache-control": "no-store",
          "x-robots-tag": "noindex, nofollow"
        }
      });
    }
    return new Response("unauthorized", { status: 401 });
  }
  const resp = await c.env.ASSETS.fetch(c.req.raw);
  const headers = new Headers(resp.headers);
  headers.set("x-robots-tag", "noindex, nofollow");
  if (c.req.path.startsWith("/assets/")) {
    headers.set("cache-control", "public, max-age=31536000, immutable");
  }
  return new Response(resp.body, { status: resp.status, headers });
});
app.onError((err) => {
  console.error("worker error", err);
  return json({ error: "server_error" }, 500);
});
var index_default = app;
export {
  index_default as default
};
