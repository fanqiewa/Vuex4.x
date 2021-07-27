/*!
 * vuex v4.0.0
 */
var Vuex = (function (vue) {
  'use strict';

  var storeKey = 'store';

  function useStore (key) {
    if ( key === void 0 ) key = null;

    return vue.inject(key !== null ? key : storeKey)
  }

  // target = window || {}
  var target = typeof window !== 'undefined'
    ? window
    : typeof global !== 'undefined'
      ? global
      : {};

  // 调试工具： https://github.com/vuejs/vue-devtools
  var devtoolHook = target.__VUE_DEVTOOLS_GLOBAL_HOOK__;

  /**
   * 初始化Vuex调试工具
   * @param {Object} store store
   */
  function devtoolPlugin (store) {
    if (!devtoolHook) { return }

    /** -----------------TODO-start-------------------- */

    store._devtoolHook = devtoolHook;

    devtoolHook.emit('vuex:init', store);

    devtoolHook.on('vuex:travel-to-state', function (targetState) {
      store.replaceState(targetState);
    });
    
    /** -----------------TODO-end-------------------- */

    // 添加回调函数至store._subscribers队列中
    // 在使用commit调用mutations时，会从_subscribers订阅队列中遍历出所有回调并执行
    // store.subscribe返回一个函数，执行这个函数会将之前添加的回调从store._subscribers队列中取出
    store.subscribe(function (mutation, state) {
      devtoolHook.emit('vuex:mutation', mutation, state);
    }, { prepend: true });

    // 跟subscribe函数类似
    // 添加回调函数至store._actionSubscribers队列中
    // 在dispatch时执行队列里的回调
    store.subscribeAction(function (action, state) {
      devtoolHook.emit('vuex:action', action, state);
    }, { prepend: true });
  }

  /**
   * 筛选出符合条件的数组的第一项
   * @param {Array} list 数组
   * @param {Function} f 函数
   * @return {*} 筛选后的数组的第一项
   */
  function find (list, f) {
    return list.filter(f)[0]
  }

  /**
   * 复制对象
   * @param {*} obj
   * @param {Array<Object>} cache
   * @return {Object | Array}
   */
  function deepCopy (obj, cache) {
    if ( cache === void 0 ) cache = [];

    // 递归出口
    if (obj === null || typeof obj !== 'object') {
      return obj
    }

    // 防止无限循环（jQuery中也有类似的判断）
    // eg: cache = { name: cache, age: 18 } name的属性值又指向了自己
    var hit = find(cache, function (c) { return c.original === obj; });
    if (hit) {
      return hit.copy
    }

    var copy = Array.isArray(obj) ? [] : {};
    cache.push({
      original: obj,
      copy: copy
    });

    Object.keys(obj).forEach(function (key) {
      copy[key] = deepCopy(obj[key], cache);
    });

    return copy
  }

  /**
   * 遍历对象，并执行传入的函数
   * @param {Object} obj 遍历的对象
   * @param {Function} fn 执行的方法
   * fn执行时传入两个参数，分别是
   * 1、obj的属性值
   * 2、obj的属性名 
   */
  function forEachValue (obj, fn) {
    Object.keys(obj).forEach(function (key) { return fn(obj[key], key); });
  }

  function isObject (obj) {
    return obj !== null && typeof obj === 'object'
  }

  function isPromise (val) {
    return val && typeof val.then === 'function'
  }

  /**
   * 断言|错误
   * @param {Boolean} condition 
   * @param {String} msg 
   */
  function assert (condition, msg) {
    if (!condition) { throw new Error(("[vuex] " + msg)) }
  }

  /**
   * 返回一个闭包函数，私有化变量
   * @param {Function} fn 
   * @param {*} arg 
   */
  function partial (fn, arg) {
    return function () {
      return fn(arg)
    }
  }

  // 存储模块（即程序员传递的options中定义的modules）的基本数据结构，带有某些属性和方法的构造函数
  var Module = function Module (rawModule, runtime) {
    this.runtime = runtime;
    // 用于存储子模块
    this._children = Object.create(null);
    // 存储程序员传递的源模块对象
    this._rawModule = rawModule;
    var rawState = rawModule.state;

    // 确保options上的state为一个对象
    this.state = (typeof rawState === 'function' ? rawState() : rawState) || {};
  };

  var prototypeAccessors = { namespaced: { configurable: true } };

  // 定义modules的命名空间的获取方式
  prototypeAccessors.namespaced.get = function () {
    return !!this._rawModule.namespaced
  };

  /** ----------------------Module构造函数原型上的方法-start--------------------------- */
  
  /** 1、添加子模块 */
  Module.prototype.addChild = function addChild (key, module) {
    this._children[key] = module;
  };

  /** 2、移除子模块 */
  Module.prototype.removeChild = function removeChild (key) {
    delete this._children[key];
  };

  /** 3、获取子模块 */
  Module.prototype.getChild = function getChild (key) {
    return this._children[key]
  };

  /** 4、是否含有子模块 */
  Module.prototype.hasChild = function hasChild (key) {
    return key in this._children
  };

  /** 5、更新模块的namespaced、getters、mutations、actions */
  Module.prototype.update = function update (rawModule) {
    this._rawModule.namespaced = rawModule.namespaced;
    if (rawModule.actions) {
      this._rawModule.actions = rawModule.actions;
    }
    if (rawModule.mutations) {
      this._rawModule.mutations = rawModule.mutations;
    }
    if (rawModule.getters) {
      this._rawModule.getters = rawModule.getters;
    }
  };

  /** 6、遍历直接子模块，并执行函数 */
  Module.prototype.forEachChild = function forEachChild (fn) {
    forEachValue(this._children, fn);
  };

  /** 7、遍历getters，并执行函数 */
  Module.prototype.forEachGetter = function forEachGetter (fn) {
    if (this._rawModule.getters) {
      forEachValue(this._rawModule.getters, fn);
    }
  };

  /** 8、遍历actions，并执行函数 */
  Module.prototype.forEachAction = function forEachAction (fn) {
    if (this._rawModule.actions) {
      forEachValue(this._rawModule.actions, fn);
    }
  };

  /** 9、遍历mutations，并执行函数 */
  Module.prototype.forEachMutation = function forEachMutation (fn) {
    if (this._rawModule.mutations) {
      forEachValue(this._rawModule.mutations, fn);
    }
  };

  /** ----------------------Module构造函数原型上的方法-end--------------------------- */

  Object.defineProperties( Module.prototype, prototypeAccessors );

  // modules集合的构造器
  var ModuleCollection = function ModuleCollection (rawRootModule) {
    // 注册根modules
    this.register([], rawRootModule, false);
  };

  /** ----------------------ModuleCollection构造函数原型上的方法-start--------------------------- */
  
  /** 1、获取指定路径（命名空间）的module */
  ModuleCollection.prototype.get = function get (path) {
    // eg: path = ['feature', 'character']
    // 从根module -> feature -> character
    return path.reduce(function (module, key) {
      return module.getChild(key)
    }, this.root /** 从根module开始查找 */)
  };

  /** 2、获取指定路径（命名空间）的module的命名空间名称 */
  ModuleCollection.prototype.getNamespace = function getNamespace (path) {
    var module = this.root;
    // return 
    // eg: 'feature/character/'
    return path.reduce(function (namespace, key) {
      module = module.getChild(key);
      return namespace + (module.namespaced ? key + '/' : '')
    }, '')
  };

  /** 3、更新module */
  ModuleCollection.prototype.update = function update$1 (rawRootModule) {
    update([], this.root, rawRootModule);
  };

  /** 4、注册module */
  ModuleCollection.prototype.register = function register (path, rawModule, runtime) {
      var this$1 = this;
      // 不传runtime时，runtime为true，也即：运行时注册的模块，可以手动注销模块
      if ( runtime === void 0 ) runtime = true;

    {
      // 断言module类型
      assertRawModule(path, rawModule);
    }

    var newModule = new Module(rawModule, runtime);
    if (path.length === 0) {
      this.root = newModule; // 根module
    } else {
      // path.slice(0, -1)获取除了数组最后一位的所有项
      // ModuleCollection.prototype.get返回指定命名空间下的module，path为空时，返回this.root
      var parent = this.get(path.slice(0, -1));
      // 将path数组中的最后一位（也就是自己），绑定到parent的_children对象上
      parent.addChild(path[path.length - 1], newModule);
    }

    // 程序员传递的options有modules时
    if (rawModule.modules) {
      forEachValue(rawModule.modules, function (rawChildModule, key) {
        // 注册子模块，path数组添加modules的属性名
        this$1.register(path.concat(key), rawChildModule, runtime);
      });
    }
  };

  /** 5、注销（移除）module */
  ModuleCollection.prototype.unregister = function unregister (path) {
    var parent = this.get(path.slice(0, -1));
    var key = path[path.length - 1];
    var child = parent.getChild(key);

    if (!child) {
      {
        console.warn(
          "[vuex] trying to unregister module '" + key + "', which is " +
          "not registered"
        );
      }
      return
    }

    // 通过new Vuex.Store()注册的modules，传入的runtime为false，所以不能移除模块
    // 通过Store.prototype.registerModule注册的modules，没有接收runtime参数，所以runtime为true，可以移除模块
    if (!child.runtime) {
      return
    }

    parent.removeChild(key);
  };

  /** 6、是否注册有module */
  ModuleCollection.prototype.isRegistered = function isRegistered (path) {
    var parent = this.get(path.slice(0, -1));
    var key = path[path.length - 1];

    if (parent) {
      return parent.hasChild(key)
    }

    return false
  };

  /** ----------------------ModuleCollection构造函数原型上的方法-end--------------------------- */

  function update (path, targetModule, newModule) {
    {
      assertRawModule(path, newModule);
    }

    // 调用Module.prototype.update方法
    targetModule.update(newModule);

    // 更新子模块
    if (newModule.modules) {
      for (var key in newModule.modules) {
        // 如果当前模块中没有模块名为（key）的子模块，发出警告
        if (!targetModule.getChild(key)) {
          {
            console.warn(
              "[vuex] trying to add a new module '" + key + "' on hot reloading, " +
              'manual reload is needed'
            );
          }
          return
        }
        update(
          path.concat(key),
          targetModule.getChild(key),
          newModule.modules[key]
        );
      }
    }
  }

  // 函数类型断言 | assert为判断的方法 | expected为发出警告的提示话语
  var functionAssert = {
    assert: function (value) { return typeof value === 'function'; },
    expected: 'function'
  };

  // 对象类型断言 | assert为判断的方法 | expected为发出警告的提示话语
  var objectAssert = {
    assert: function (value) { return typeof value === 'function' ||
      (typeof value === 'object' && typeof value.handler === 'function'); },
    expected: 'function or object with "handler" function'
  };

  var assertTypes = {
    getters: functionAssert,
    mutations: functionAssert,
    actions: objectAssert
  };

  // 断言传入的options是否符合Vuex需要的类型
  function assertRawModule (path, rawModule) {
    // 断言getters、mutations、actions
    Object.keys(assertTypes).forEach(function (key) {
      if (!rawModule[key]) { return }

      var assertOptions = assertTypes[key];

      forEachValue(rawModule[key], function (value, type) {
        assert(
          assertOptions.assert(value),
          // eg: makeAssertionMessage([], 'actions', 'actions', function increment({ commit }) { }, 'function or object with "handler" function')
          makeAssertionMessage(path, key, type, value, assertOptions.expected)
        );
      });
    });
  }

  // 组装（类型断言）错误提示
  function makeAssertionMessage (path, key, type, value, expected) {
    var buf = key + " should be " + expected + " but \"" + key + "." + type + "\"";
    if (path.length > 0) {
      buf += " in module \"" + (path.join('.')) + "\"";
    }
    buf += " is " + (JSON.stringify(value)) + ".";
    return buf
  }

  function createStore (options) {
    return new Store(options)
  }

  // Store构造函数
  var Store = function Store (options) {
    var this$1 = this;
    if ( options === void 0 ) options = {};

    {
      assert(typeof Promise !== 'undefined', "vuex requires a Promise polyfill in this browser.");
      assert(this instanceof Store, "store must be called with the new operator.");
    }

    // 插件数组
    var plugins = options.plugins; if ( plugins === void 0 ) plugins = [];
    // 严格模式的标志
    var strict = options.strict; if ( strict === void 0 ) strict = false;

    // 标志commit
    this._committing = false;
    // 存储actions，在执行registerAction时注册
    this._actions = Object.create(null);
    // 存储开启devtools调试工具时加入的回调，dispatch时触发
    this._actionSubscribers = [];
    // 存储mutations，在执行registerMutation时注册 { increment: [ fn ]}
    this._mutations = Object.create(null);
    // 存储getters，在执行registerGetter时注册，key | value形式，value为fn
    this._wrappedGetters = Object.create(null);
    // 存储modules
    /**
      eg:
      this._modules = {
        root:{
          state: { name: 'fanqiewa' },
          _children: {
            feature: { // ... },
            wealth: { // ... }
          }
        }
      }
    */
    this._modules = new ModuleCollection(options);
    // 存储modules，不过是根据命名空间来存储的，key为命名空间名，value为modules
    this._modulesNamespaceMap = Object.create(null);
    // 存储开启devtools调试工具时加入的回调，commit时触发
    this._subscribers = [];
    // 缓存本地模块（子模块）的getters，在makeLocalGetters时注册
    this._makeLocalGettersCache = Object.create(null);

    var store = this;
    var ref = this;
    var dispatch = ref.dispatch;
    var commit = ref.commit;
    this.dispatch = function boundDispatch (type, payload) {
      // 调用原型上的dispatch
      return dispatch.call(store, type, payload)
    };
    this.commit = function boundCommit (type, payload, options) {
      // 调用原型上的commit
      return commit.call(store, type, payload, options)
    };

    // 严格模式标志
    this.strict = strict;

    var state = this._modules.root.state;

    // 注册根module（注册了state、getters、mutations、actions）
    installModule(this, state, [], this._modules.root);

    // 重置storeState（这里属于初始化）
    resetStoreState(this, state);

    // 执行plugins，传入store
    plugins.forEach(function (plugin) { return plugin(this$1); });

    // 开启调试工具
    var useDevtools = options.devtools !== undefined ? options.devtools : true;
    if (useDevtools) {
      devtoolPlugin(this);
    }
  };

  var prototypeAccessors$1 = { state: { configurable: true } };

  Store.prototype.install = function install (app, injectKey) {
    app.provide(injectKey || storeKey, this);
    app.config.globalProperties.$store = this;
  };

  prototypeAccessors$1.state.get = function () {
    // this._vm 为Vue实例
    // _data 等于Vue实例的data
    return this._state.data
  };

  prototypeAccessors$1.state.set = function (v) {
    {
      // 不能直接更改state对象
      assert(false, "use store.replaceState() to explicit replace store state.");
    }
  };

  /** ----------------------Store构造函数原型上的方法-start--------------------------- */
  
  /** 1、程序员调用的commit ---------- important-api-commit 的使用 */ 
  Store.prototype.commit = function commit (_type, _payload, _options) {
      var this$1 = this;

    // 统一对象形式
    var ref = unifyObjectStyle(_type, _payload, _options);
      var type = ref.type;
      var payload = ref.payload;
      var options = ref.options;

    var mutation = { type: type, payload: payload };
    // 在new Store时注册的mutations
    var entry = this._mutations[type];
    if (!entry) {
      {
        console.error(("[vuex] unknown mutation type: " + type));
      }
      return
    }
    // 通过_withCommit方式来触发mutations
    this._withCommit(function () {
      entry.forEach(function commitIterator (handler) {
        handler(payload);
      });
    });

    // 取出所有已注册的回调并执行（注册方式：store.subscribe(fn)）
    // 在mutations执行之后触发
    this._subscribers
      .slice() // 如果订阅服务器同步调用unsubscribe，则浅拷贝可防止迭代器失效 unsubscribe
      .forEach(function (sub) { return sub(mutation, this$1.state); });

    if (
      
      options && options.silent
    ) {
      // 载荷中的silent属性已经删除了
      // 取消 Vue 所有的日志与警告
      console.warn(
        "[vuex] mutation type: " + type + ". Silent option has been removed. " +
        'Use the filter functionality in the vue-devtools'
      );
    }
  };

  /** 2、程序员调用的dispatch ---------- important-api-dispatch 的使用 */
  Store.prototype.dispatch = function dispatch (_type, _payload) {
      var this$1 = this;

    // 统一对象形式
    var ref = unifyObjectStyle(_type, _payload);
      var type = ref.type;
      var payload = ref.payload;

    var action = { type: type, payload: payload };
    // 在new Store时注册的actions
    var entry = this._actions[type];
    if (!entry) {
      {
        console.error(("[vuex] unknown action type: " + type));
      }
      return
    }

    try {
      // 取出所有已注册的回调并执行（注册方式：store.subscribeAction(fn，options)）
      // 在actions执行之前触发
      this._actionSubscribers
        .slice() 
        .filter(function (sub) { return sub.before; })
        .forEach(function (sub) { return sub.before(action, this$1.state); });
    } catch (e) {
      {
        console.warn("[vuex] error in before action subscribers: ");
        console.error(e);
      }
    }

    // 确保所有promise对象都执行完
    var result = entry.length > 1
      ? Promise.all(entry.map(function (handler) { return handler(payload); }))
      : entry[0](payload);

    // 返回一个promise对象
    return new Promise(function (resolve, reject) {
      result.then(function (res) {
        try {
          // 取出所有已注册的回调并执行（注册方式：store.subscribeAction(fn，options)）
          // 在actions执行之后触发
          this$1._actionSubscribers
            .filter(function (sub) { return sub.after; })
            .forEach(function (sub) { return sub.after(action, this$1.state); });
        } catch (e) {
          {
            console.warn("[vuex] error in after action subscribers: ");
            console.error(e);
          }
        }
        resolve(res);
      }, function (error) {
        try {
          this$1._actionSubscribers
            .filter(function (sub) { return sub.error; })
            .forEach(function (sub) { return sub.error(action, this$1.state, error); });
        } catch (e) {
          {
            console.warn("[vuex] error in error action subscribers: ");
            console.error(e);
          }
        }
        reject(error);
      });
    })
  };

  /** 3、程序员调用的subscribe */
  /**
   * 统一订阅commit，每次调用commit时，都会把store._subscribers数组中的所有函数取出并执行
   * 相当于commit的回调
   * @param {Function} fn 回调
   * @param {Object} options 只支持 { prepend: true // 表示往数组前面增加，触发顺序靠前 }
   */
  Store.prototype.subscribe = function subscribe (fn, options) {
    return genericSubscribe(fn, this._subscribers, options)
  };

  /** 4、程序员调用的subscribeAction */
  /**
   * 统一订阅dispatch，每次调用dispatch时，都会把store._actionSubscribers数组中的所有函数取出并执行
   * 相当于dispatch的回调
   * @param {Function | Object} fn 回调 
   * eg: { before: fn, after: fn, error: fn } 
   * 其中before会在actions执行前触发，after会在actions执行后返回的promise对象中触发，error为错误时触发
   * 
   * @param {Object} options 只支持 { prepend: true // 表示往数组前面增加，触发顺序靠前 }
   */
  Store.prototype.subscribeAction = function subscribeAction (fn, options) {
    var subs = typeof fn === 'function' ? { before: fn } : fn;
    return genericSubscribe(subs, this._actionSubscribers, options)
  };

  /** 5、程序员调用的watch | 监听数据 */
  Store.prototype.watch = function watch$1 (getter, cb, options) {
      var this$1 = this;

    {
      // 期待的第一个参数类型为Function
      assert(typeof getter === 'function', "store.watch only accepts a function.");
    }
    // 实际上还是得调用Vue的$watch
    // 第一个参数执行时会接收到两个参数，第一个为state，第二个为getters
    // 第一个参数必须要使用到响应式数据时，才会触发cb回调，cb接收两个参数，第一个为newVal，第二个为oldVal
    // eg: getter = function (state, getters) { return state.name + state.age }，每当返回值不同时，都会触发cb
    return vue.watch(function () { return getter(this$1.state, this$1.getters); }, cb, Object.assign({}, options))
  };

  /** 6、程序员调用的replaceState | 重置state */
  Store.prototype.replaceState = function replaceState (state) {
      var this$1 = this;

    this._withCommit(function () {
      this$1._state.data = state;
    });
  };

  /** 7、程序员调用的registerModule | 注册模块 */
  Store.prototype.registerModule = function registerModule (path, rawModule, options) {
      if ( options === void 0 ) options = {};

    if (typeof path === 'string') { path = [path]; }

    {
      assert(Array.isArray(path), "module path must be a string or an Array.");
      // path为空数组时，发出警告。不能通过此方法注册根模块
      assert(path.length > 0, 'cannot register the root module by using registerModule.');
    }
    // 调用ModuleCollection.Prototype.register进行注册（先注册）
    this._modules.register(path, rawModule);
    
    // 安装模块 | preserveState保存状态为true时，不把当前模块的state添加到父级模块的state下（后续也就无法获取）
    installModule(this, this.state, path, this._modules.get(path), options.preserveState);
    // 重置store实例，重新设置了$$state
    resetStoreState(this, this.state);
  };

  /** 8、程序员调用的unregisterModule | 卸载模块 */
  Store.prototype.unregisterModule = function unregisterModule (path) {
      var this$1 = this;

    if (typeof path === 'string') { path = [path]; }

    {
      assert(Array.isArray(path), "module path must be a string or an Array.");
    }

    // 调用ModuleCollection.Prototype.unregister进行卸载
    this._modules.unregister(path);
    this._withCommit(function () {
      var parentState = getNestedState(this$1.state, path.slice(0, -1));
      delete parentState[path[path.length - 1]];
    });
    resetStore(this);
  };

  /** 8、程序员调用的hasModule | 判断是否具有模块 */
  Store.prototype.hasModule = function hasModule (path) {
    if (typeof path === 'string') { path = [path]; }

    {
      assert(Array.isArray(path), "module path must be a string or an Array.");
    }

    // 调用ModuleCollection.Prototype.isRegistered进行判断
    return this._modules.isRegistered(path)
  };

  /** 9、程序员调用的hotUpdate | 热更新 */
  Store.prototype.hotUpdate = function hotUpdate (newOptions) {
    this._modules.update(newOptions);
    resetStore(this, true);
  };

  // 10、通过_withCommit执行的函数，即使是在严格模式下，也不会发出警告
  Store.prototype._withCommit = function _withCommit (fn) {
    var committing = this._committing;
    this._committing = true;
    fn();
    this._committing = committing;
  };

  // 设置state的get和set
  Object.defineProperties( Store.prototype, prototypeAccessors$1 );

  /**
   * 统一订阅 | 将fn添加进subs数组中，options对象的可选属性有prepend（即：往订阅的数组前面添加）
   * @param {Function | Object} fn 回调函数 | 对象
   * @param {Array} subs 订阅的数组
   * @param {Object} options options对象
   * @return 返回一个函数，执行这个回调会把传入的fn从subs数组中移除
   */
  function genericSubscribe (fn, subs, options) {
    if (subs.indexOf(fn) < 0) {
      options && options.prepend
        ? subs.unshift(fn)
        : subs.push(fn);
    }
    return function () {
      var i = subs.indexOf(fn);
      if (i > -1) {
        subs.splice(i, 1);
      }
    }
  }

  /**
   * 重置Store（也叫初始化）
   */
  function resetStore (store, hot) {
    store._actions = Object.create(null);
    store._mutations = Object.create(null);
    store._wrappedGetters = Object.create(null);
    store._modulesNamespaceMap = Object.create(null);
    var state = store.state;
    // 重新初始化模块
    installModule(store, state, [], store._modules.root, true);
    // 重置StoreVM
    resetStoreState(store, state, hot);
  }

  /**
   * 重置storeState
   * @param {Object} store Store实例
   * @param {Object} state store.state
   * @param {*} hot 
   */
  function resetStoreState (store, state, hot) {
    var oldState = store._state;

    // 绑定store公共的getters，使用getters时，从这里取值
    store.getters = {};
    // 重置本地缓存的getters对象
    store._makeLocalGettersCache = Object.create(null);
    var wrappedGetters = store._wrappedGetters;
    var computedObj = {};
    forEachValue(wrappedGetters, function (fn, key) {
      // 每一个计算属性都是一个单独的闭包函数
      computedObj[key] = partial(fn, store);
      Object.defineProperty(store.getters, key, {
        // 调用getters时，实际上调用的是Vue实例的computed属性 ---------- important-api-getter 的使用
        get: function () { return computedObj[key](); },
        enumerable: true 
      });
    });

    store._state = vue.reactive({
      data: state
    });

    // 开启严格模式
    if (store.strict) {
      enableStrictMode(store);
    }

    // 初始化时不执行
    if (oldState) {
      if (hot) {
        // 在热更新模式下，更改旧Vm的$$state，以达到发布通知，更改视图
        store._withCommit(function () {
          oldState.data = null;
        });
      }
    }
  }

  /**
   * 安装modules
   * @param {Object} store 
   * @param {Object} rootState 根state
   * @param {Array} path 模块路径 ['feature', 'character']
   * @param {Object} module 模块
   * @param {Boolean} hot 
   */
  function installModule (store, rootState, path, module, hot) {
    // 是否是根模块
    var isRoot = !path.length;
    // 获取模块的空间名称 eg: 'feature/character/'
    var namespace = store._modules.getNamespace(path);

    // 注册命名空间的map对象，用来存储以注册的modules
    if (module.namespaced) {
      // 命名空间重复时，发出警告
      if (store._modulesNamespaceMap[namespace] && true) {
        console.error(("[vuex] duplicate namespace " + namespace + " for the namespaced module " + (path.join('/'))));
      }
      store._modulesNamespaceMap[namespace] = module;
    }

    // （注册子模块时 && 执行Store.prototype.registerModule注册模块时，如果传入的options.preserveState为undefined时）通过判断
    if (!isRoot && !hot) {
      /**
        父级state，也就是说，根state保存的是一个对象，里面有子对象，保存的是子模块的state
        eg:
        feature.state = parentState = {
          age: '18',
          character: {
            height: '170cm'
          }
        }
      */
      var parentState = getNestedState(rootState, path.slice(0, -1));
      // 子模块名称
      var moduleName = path[path.length - 1];
      store._withCommit(function () {
        {
          if (moduleName in parentState) {
            console.warn(
              ("[vuex] state field \"" + moduleName + "\" was overridden by a module with the same name at \"" + (path.join('.')) + "\"")
            );
          }
        }
        // 给父级state添加属性，属性名为子模块module名，值为子模块的state 
        // 通过赋值以后，getNestedState就能从根state向子模块的state中取值 ---------- important-api-state 的使用
        parentState[moduleName] = module.state;
      });
    }

    /**
      在注册modules时，局部化dispatch、commit、getters、state
      eg: 
      local = {
        // dispatch | commit
        // 无命名空间时，直接从store的原型上获取；有命名空间时，将type（类型）组装成带有命名空间的字符串，然后调用store原型上的方法
        dispatch,
        commit,

        // 无命名空间时，直接从store.getters获取，有命名空间时，从store._makeLocalGettersCache中获取
        getters,
        // 无论有无命名空间，都会从store.state对象往下递归查找，直至找到当前模块时为止。
        state
      }
    */
    var local = module.context = makeLocalContext(store, namespace, path);

    // 遍历mutations，执行回调
    module.forEachMutation(function (mutation, key) {
      var namespacedType = namespace + key;
      // eg: namespacedType = 'feature/character/'
      registerMutation(store, namespacedType, mutation, local);
    });

    // 遍历actions，执行回调
    module.forEachAction(function (action, key) {
      var type = action.root ? key : namespace + key;
      /**
        两种形式
        actions: {
          increment(context) { },
          decrement: {
            handler: function() { },
            // 扩展 表示当前action注册到根对象上
            root: true 
          }
        }
      */
      var handler = action.handler || action;
      registerAction(store, type, handler, local);
    });

    // 遍历getters，执行回调
    module.forEachGetter(function (getter, key) {
      var namespacedType = namespace + key;
      registerGetter(store, namespacedType, getter, local);
    });

    // 遍历子模块（如果有的话，在new ModuleCollection时，已经往_child中添加了子模块，在这里是可以拿得到的），执行回调
    module.forEachChild(function (child, key) {
      // 安装子模块
      installModule(store, rootState, path.concat(key), child, hot);
    });
  }

  /**
   * 局部化dispatch, commit, getters and state
   * 也就是在模块里定义的actions函数，在函数内部，可以使用local定义的dispatch, commit, getters and state
   */
  function makeLocalContext (store, namespace, path) {
    var noNamespace = namespace === '';

    var local = {
      dispatch: noNamespace ? store.dispatch : function (_type, _payload, _options) {
        
        // 有命名空间的模块，在注册actions时，局部可以调用这个dispatch方法
        var args = unifyObjectStyle(_type, _payload, _options);
        var payload = args.payload;
        var options = args.options;
        var type = args.type;

        /**
          不传第三个参数或第三个参数中的root为false时，将会调用根的actions
          eg: 
          modules: {
            foo: {
              namespaced: true,
              actions: {
                // 在这个模块中， dispatch 和 commit 也被局部化了
                // 他们可以接受 `root` 属性以访问根 dispatch 或 commit
                someAction ({ dispatch, commit, getters, rootGetters }) {
                  getters.someGetter // -> 'foo/someGetter'
                  rootGetters.someGetter // -> 'someGetter'

                  dispatch('someOtherAction') // -> 'foo/someOtherAction'
                  dispatch('someOtherAction', null, { root: true }) // -> 'someOtherAction'

                  commit('someMutation') // -> 'foo/someMutation'
                  commit('someMutation', null, { root: true }) // -> 'someMutation'
                },
                someOtherAction (ctx, payload) { ... }
              }
            }
          }
        */
        if (!options || !options.root) {
          type = namespace + type;
          if ( !store._actions[type]) {
            console.error(("[vuex] unknown local action type: " + (args.type) + ", global type: " + type));
            return
          }
        }

        return store.dispatch(type, payload)
      },

      commit: noNamespace ? store.commit : function (_type, _payload, _options) {
        var args = unifyObjectStyle(_type, _payload, _options);
        var payload = args.payload;
        var options = args.options;
        var type = args.type;

        if (!options || !options.root) {
          type = namespace + type;
          if ( !store._mutations[type]) {
            console.error(("[vuex] unknown local mutation type: " + (args.type) + ", global type: " + type));
            return
          }
        }

        store.commit(type, payload, options);
      }
    };

    // getter和state对象必须延迟获取，因为它们可能会改变，在vm实例更新时
    Object.defineProperties(local, {
      getters: {
        get: noNamespace
          ? function () { return store.getters; }
          : function () { return makeLocalGetters(store, namespace); }
      },
      state: {
        // 通过一层层查找
        get: function () { return getNestedState(store.state, path); }
      }
    });

    return local
  }

  /**
   * 局部化getters
   * 也就是在模块里定义的actions函数，在函数内部，可以使用local定义的state, getters, rootState, rootGetters
   */
  function makeLocalGetters (store, namespace) {
    if (!store._makeLocalGettersCache[namespace]) {
      var gettersProxy = {};
      var splitPos = namespace.length;
      Object.keys(store.getters).forEach(function (type) {

        // 如果目标字符串和命名空间不匹配，则跳过循环
        // type为getters的属性名 eg: 'feature/character/getHeight'
        // namespace为当前模块名 eg: 'feature/character/'
        if (type.slice(0, splitPos) !== namespace) { return }

        // localType为截取后的getters属性名 eg: getHeight
        var localType = type.slice(splitPos);

        // 定义本地模块（子模块）的getter的读取 
        // eg: store.getHeight() => store.feature.character.getHeight()
        Object.defineProperty(gettersProxy, localType, {
          get: function () { return store.getters[type]; },
          enumerable: true
        });
      });
      // 缓存 下次直接从缓存对象中获取
      store._makeLocalGettersCache[namespace] = gettersProxy;
    }

    return store._makeLocalGettersCache[namespace]
  }

  // 注册程序员定义的mutations
  function registerMutation (store, type, handler, local) {
    var entry = store._mutations[type] || (store._mutations[type] = []);
    entry.push(function wrappedMutationHandler (payload) {
      handler.call(store, local.state, payload);
    });
  }

  // 注册程序员定义的actions
  function registerAction (store, type, handler, local) {
    var entry = store._actions[type] || (store._actions[type] = []);
    entry.push(function wrappedActionHandler (payload) {
      var res = handler.call(store, {
        dispatch: local.dispatch,
        commit: local.commit,
        getters: local.getters,
        state: local.state,
        rootGetters: store.getters,
        rootState: store.state
      }, payload);
      if (!isPromise(res)) {
        res = Promise.resolve(res);
      }
      if (store._devtoolHook) {
        return res.catch(function (err) {
          store._devtoolHook.emit('vuex:error', err);
          throw err
        })
      } else {
        return res
      }
    });
  }

  // 注册程序员定义的getters
  function registerGetter (store, type, rawGetter, local) {
    if (store._wrappedGetters[type]) {
      {
        console.error(("[vuex] duplicate getter key: " + type));
      }
      return
    }
    store._wrappedGetters[type] = function wrappedGetter (store) {
      return rawGetter(
        local.state, // local state
        local.getters, // local getters
        store.state, // root state
        store.getters // root getters
      )
    };
  }

  /**
   * 开启严格模式，监听$$state的改变
   */
  function enableStrictMode (store) {
    // 监听$$state改变时触发回调
    // Vue.prototype.$watch(expOrFn, cb, options)
    // deep表示深度监听，sync表示立即执行watch中的回调方法，不需要等到视图渲染完毕
    vue.watch(function () { return store._state.data; }, function () {
      {
        // store._committing默认为false，通过mutation函数引起的将会触发_withCommit将_committing置为true
        // 也就是说，在开启严格模式时，在外部更改$$state会发出警告
        assert(store._committing, "do not mutate vuex store state outside mutation handlers.");
      }
    }, { deep: true, flush: 'sync' });
  }

  // 查找指定路径下的state（从对象上层往下找）
  function getNestedState (state, path) {
    return path.reduce(function (state, key) { return state[key]; }, state)
  }

  /**
   * 统一对象形式
   * @param {Object | String} type 类型
   * @param {*} payload 载荷
   * @param {*} options 
   */
  function unifyObjectStyle (type, payload, options) {
    if (isObject(type) && type.type) {
      options = payload;
      payload = type;
      type = type.type;
    }

    {
      assert(typeof type === 'string', ("expects string as the type, but found " + (typeof type) + "."));
    }

    // 即便传了第三个参数options，最终也是等于payload载荷
    return { type: type, payload: payload, options: options }
  }

  /**
   * mapState辅助函数，以减少Vue代码量
   * normalizeNamespace执行会返回一个函数，mapState在执行时需要传递两个参数 
   * 第一个参数可以是字符串（表示命名空间）|| 对象或数组（表示需要映射出来的states）
   * 第二个参数字符串数组或对象。对象属性值可以为字符串或函数，为字符串时直接，直接使用，为函数时，该函数第一个形参为state，第二个形参为getters
   * @param {String} [namespace] - 模块的命名空间 
   * @param { Array<string> | Object<string | function> } states 一个对象或数组
   * @return {Object} 返回一个对象，是通过states解析出来的key|value形式
   * @example
   * 
   * computed: {
   *   ...mapState('some/nested/module', {
   *     a: state => state.a,
   *     b: state => state.b
   *   })
   * }
   * 
   * 即res = { a: fn, b: fn }
   * 因为挂载到了computed上，所以调用时不需要fn加()进行调用
   * 
   */
  var mapState = normalizeNamespace(function (namespace, states) {
    var res = {};
    // 期待一个对象或数组
    if ( !isValidMap(states)) {
      console.error('[vuex] mapState: mapper parameter must be either an Array or an Object');
    }
    // normalizeMap格式化states后，变成数组对象key|value形式
    normalizeMap(states).forEach(function (ref) {
      var key = ref.key;
      var val = ref.val;

      res[key] = function mappedState () {
        var state = this.$store.state;
        var getters = this.$store.getters;
        if (namespace) {
          // 根据命名空间获取module
          var module = getModuleByNamespace(this.$store, 'mapState', namespace);
          if (!module) {
            return
          }
          // var local = module.context 本地（局部）的dispatch、commit、getters、state
          state = module.context.state;
          getters = module.context.getters;
        }
        return typeof val === 'function'
          ? val.call(this, state, getters)
          : state[val]
      };
      // mark vuex getter for devtools
      res[key].vuex = true;
    });
    return res
  });

  /**
   * mapMutations辅助函数，以减少Vue代码量
   * normalizeNamespace执行会返回一个函数，mapMutations在执行时需要传递两个参数 
   * 第一个参数可以是字符串（表示命名空间）|| 对象或数组（表示需要映射出来的states）
   * 第二个参数字符串数组或对象。对象属性值可以为字符串或函数，为字符串时直接，直接使用，为函数时，该函数第一个形参为commit，需要手动触发（传入commit类型）
   * @param {String} [namespace] - namespace 为空时，表示commit根模块的
   * @param { Array<string> | Object<string | function } mutations # 一个对象或数组
   * @return {Object}
   * eg:
   *  methods: {
   *    ...mapActions('some/nested/module', [
   *      'foo', // -> this.foo()
   *      'bar' // -> this.bar()
   *    ]),
   *    
   *    ...mapActions('some/nested/module', [
   *      'fooA': (commit, a) => { // something }, // -> this.fooA('a')
   *      'barB': (commit, a) => { // something } // -> this.barB('a')
   *    ])
   * 
   *  }
   */
  var mapMutations = normalizeNamespace(function (namespace, mutations) {
    var res = {};
    if ( !isValidMap(mutations)) {
      console.error('[vuex] mapMutations: mapper parameter must be either an Array or an Object');
    }
    normalizeMap(mutations).forEach(function (ref) {
      var key = ref.key;
      var val = ref.val;

      res[key] = function mappedMutation () {
        var args = [], len = arguments.length;
        while ( len-- ) args[ len ] = arguments[ len ];

        // Get the commit method from store
        var commit = this.$store.commit;
        if (namespace) {
          var module = getModuleByNamespace(this.$store, 'mapMutations', namespace);
          if (!module) {
            return
          }
          commit = module.context.commit;
        }
        return typeof val === 'function'
          ? val.apply(this, [commit].concat(args)) // val为函数时，{ key: (commit) => { } } val执行时第一个参数为commit，后续commit需要自己手动操作
          : commit.apply(this.$store, [val].concat(args)) // 如果val是字符串，则val即为commit的类型，args的payload载荷
      };
    });
    return res
  });

  /**
   * mapGetters辅助函数，以减少Vue代码量
   * normalizeNamespace执行会返回一个函数，mapGetters在执行时需要传递两个参数 
   * 第一个参数可以是字符串（表示命名空间）|| 对象或数组（表示需要映射出来的states）
   * 第二个参数字符串数组或对象。对象属性值只能是字符串
   * @param { String } [namespace] - 模块的命名空间 
   * @param { Array<string> | Object<string> } getters # 一个对象或数组
   * @return {Object}
   */
  var mapGetters = normalizeNamespace(function (namespace, getters) {
    var res = {};
    if ( !isValidMap(getters)) {
      console.error('[vuex] mapGetters: mapper parameter must be either an Array or an Object');
    }
    normalizeMap(getters).forEach(function (ref) {
      var key = ref.key;
      var val = ref.val;

      // getters的取值需要完整的命名空间
      val = namespace + val;
      res[key] = function mappedGetter () {
        if (namespace && !getModuleByNamespace(this.$store, 'mapGetters', namespace)) {
          return
        }
        if ( !(val in this.$store.getters)) {
          console.error(("[vuex] unknown getter: " + val));
          return
        }
        return this.$store.getters[val]
      };
      // mark vuex getter for devtools
      res[key].vuex = true;
    });
    return res
  });

  /**
   * mapActions辅助函数，以减少Vue代码量
   * normalizeNamespace执行会返回一个函数，mapActions在执行时需要传递两个参数 
   * 第一个参数可以是字符串（表示命名空间）|| 对象或数组（表示需要映射出来的states）
   * 第二个参数字符串数组或对象。对象属性值可以为字符串或函数，为字符串时直接，直接使用，为函数时，该函数第一个形参为dispatch，需要手动触发（传入dispatch类型）
   * @param {String} [namespace] - 模块的命名空间 
   * @param { Array<string> | Object<string | function } actions # 一个对象或数组
   * @return {Object}
   */
  var mapActions = normalizeNamespace(function (namespace, actions) {
    var res = {};
    if ( !isValidMap(actions)) {
      console.error('[vuex] mapActions: mapper parameter must be either an Array or an Object');
    }
    normalizeMap(actions).forEach(function (ref) {
      var key = ref.key;
      var val = ref.val;

      res[key] = function mappedAction () {
        var args = [], len = arguments.length;
        while ( len-- ) args[ len ] = arguments[ len ];

        // get dispatch function from store
        var dispatch = this.$store.dispatch;
        if (namespace) {
          var module = getModuleByNamespace(this.$store, 'mapActions', namespace);
          if (!module) {
            return
          }
          dispatch = module.context.dispatch;
        }
        return typeof val === 'function'
          ? val.apply(this, [dispatch].concat(args))
          : dispatch.apply(this.$store, [val].concat(args))
      };
    });
    return res
  });

  /**
   * createNamespacedHelpers辅助函数，创建基于某个命名空间辅助函数
   * @param {String} namespace
   * @return {Object} 返回一个对象，包含mapState、mapGetters、mapMutations、mapActions辅助函数
   */
  var createNamespacedHelpers = function (namespace) { return ({
    mapState: mapState.bind(null, namespace),
    mapGetters: mapGetters.bind(null, namespace),
    mapMutations: mapMutations.bind(null, namespace),
    mapActions: mapActions.bind(null, namespace)
  }); };

  /**
   * 格式化map，变成数组对象key|value形式
   * normalizeMap([1, 2, 3]) => [ { key: 1, val: 1 }, { key: 2, val: 2 }, { key: 3, val: 3 } ]
   * normalizeMap({a: 1, b: 2, c: 3}) => [ { key: 'a', val: 1 }, { key: 'b', val: 2 }, { key: 'c', val: 3 } ]
   * @param {Array|Object} map
   * @return {Object}
   */
  function normalizeMap (map) {
    if (!isValidMap(map)) {
      return []
    }
    return Array.isArray(map)
      ? map.map(function (key) { return ({ key: key, val: key }); })
      : Object.keys(map).map(function (key) { return ({ key: key, val: map[key] }); })
  }

  /**
   * 验证给定map是否有效
   * @param {*} map
   * @return {Boolean}
   */
  function isValidMap (map) {
    return Array.isArray(map) || isObject(map)
  }

  /**
   * 它将规范化命名空间，返回一个函数
   * @param {Function} fn
   * @return {Function}
   */
  function normalizeNamespace (fn) {
    return function (namespace, map) {
      if (typeof namespace !== 'string') { // 如果函数执行时第一个参数给的不是字符串，那么就把第一个参数当成map对象，命名空间则为""
        map = namespace;
        namespace = '';
      } else if (namespace.charAt(namespace.length - 1) !== '/') { // 如果命名空间字符串最后一位没有"/"的话，为其加上
        namespace += '/';
      }
      return fn(namespace, map)
    }
  }

  /**
   * 按命名空间从存储区搜索特殊模块。如果模块不存在，则打印错误消息。
   * @param {Object} store
   * @param {String} helper
   * @param {String} namespace
   * @return {Object}
   */
  function getModuleByNamespace (store, helper, namespace) {
    var module = store._modulesNamespaceMap[namespace];
    if ( !module) {
      console.error(("[vuex] module namespace not found in " + helper + "(): " + namespace));
    }
    return module
  }

  // Credits: borrowed code from fcomb/redux-logger
  // 日志插件
  function createLogger (ref) {
    if ( ref === void 0 ) ref = {};
    // collapsed   自动展开记录的 mutation
    var collapsed = ref.collapsed; if ( collapsed === void 0 ) collapsed = true;
    // filter   若 mutation 需要被记录，就让它返回 true 即可, 顺便，`mutation` 是个 { type, payload } 对象
    var filter = ref.filter; if ( filter === void 0 ) filter = function (mutation, stateBefore, stateAfter) { return true; };
   // transformer   在开始记录之前转换状态 例如，只返回指定的子树
    var transformer = ref.transformer; if ( transformer === void 0 ) transformer = function (state) { return state; };
    // mutationTransformer   mutation 按照 { type, payload } 格式记录 我们可以按任意方式格式化
    var mutationTransformer = ref.mutationTransformer; if ( mutationTransformer === void 0 ) mutationTransformer = function (mut) { return mut; };
    // actionFilter   和 `filter` 一样，但是是针对 action 的   `action` 的格式是 `{ type, payload }`
    var actionFilter = ref.actionFilter; if ( actionFilter === void 0 ) actionFilter = function (action, state) { return true; };
    // actionTransformer   和 `mutationTransformer` 一样，但是是针对 action 的
    var actionTransformer = ref.actionTransformer; if ( actionTransformer === void 0 ) actionTransformer = function (act) { return act; };
    
    // 记录 mutation 日志
    var logMutations = ref.logMutations; if ( logMutations === void 0 ) logMutations = true;
    // 记录 action  日志
    var logActions = ref.logActions; if ( logActions === void 0 ) logActions = true;
    // 自定义 console 实现，默认为 `console`
    var logger = ref.logger; if ( logger === void 0 ) logger = console;

    return function (store) {
      // state改变前
      var prevState = deepCopy(store.state);

      // 没有console，谈何日志
      if (typeof logger === 'undefined') {
        return
      }

      if (logMutations) {
        store.subscribe(function (mutation, state) {
          // state改变后
          var nextState = deepCopy(state);

          if (filter(mutation, prevState, nextState)) {
            var formattedTime = getFormattedTime();
            var formattedMutation = mutationTransformer(mutation);
            var message = "mutation " + (mutation.type) + formattedTime;

            startMessage(logger, message, collapsed);
            // 输出的信息带颜色
            logger.log('%c prev state', 'color: #9E9E9E; font-weight: bold', transformer(prevState));
            logger.log('%c mutation', 'color: #03A9F4; font-weight: bold', formattedMutation);
            logger.log('%c next state', 'color: #4CAF50; font-weight: bold', transformer(nextState));
            endMessage(logger);
          }

          prevState = nextState;
        });
      }

      if (logActions) {
        store.subscribeAction(function (action, state) {
          if (actionFilter(action, state)) {
            var formattedTime = getFormattedTime();
            var formattedAction = actionTransformer(action);
            var message = "action " + (action.type) + formattedTime;

            startMessage(logger, message, collapsed);
            logger.log('%c action', 'color: #03A9F4; font-weight: bold', formattedAction);
            endMessage(logger);
          }
        });
      }
    }
  }

  // 开始信息
  function startMessage (logger, message, collapsed) {
    var startMessage = collapsed
      ? logger.groupCollapsed // 可折叠的信息，需要手动展开
      : logger.group;

    // render
    try {
      startMessage.call(logger, message);
    } catch (e) {
      logger.log(message);
    }
  }

  // 结束信息
  function endMessage (logger) {
    try {
      logger.groupEnd(); // 退出控制台中的当前内联组
    } catch (e) {
      logger.log('—— log end ——');
    }
  }

  // 格式化时间
  function getFormattedTime () {
    var time = new Date();
    // time.getHours() => 小时
    // time.getMinutes() => 分钟
    // time.getSeconds() => 秒
    // time.getMilliseconds() => 毫秒
    return (" @ " + (pad(time.getHours(), 2)) + ":" + (pad(time.getMinutes(), 2)) + ":" + (pad(time.getSeconds(), 2)) + "." + (pad(time.getMilliseconds(), 3)))
  }

  function repeat (str, times) {
    return (new Array(times + 1)).join(str)
  }

  function pad (num, maxLength) {
    return repeat('0', maxLength - num.toString().length) + num
  }

  var index_cjs = {
    version: '4.0.0',
    Store: Store,
    storeKey: storeKey,
    createStore: createStore,
    useStore: useStore,
    mapState: mapState,
    mapMutations: mapMutations,
    mapGetters: mapGetters,
    mapActions: mapActions,
    createNamespacedHelpers: createNamespacedHelpers,
    createLogger: createLogger
  };

  return index_cjs;

}(Vue));
