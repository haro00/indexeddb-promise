/**
 * indexedDB的增删改查:
 *
 * 1. 所有的数据库操作都是异步的!!!必须处理好异步,否则会造成某一操作的数据库版本过时!!!
 * 2. 建议耗时的操作在webWorker中进行
 */

export default class IndexedDB {
    
    constructor(name) {
        this.database = name;
    }
    
    // 数据库名
    database = '';
    // 数据库对象
    DB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
    // 游标范围
    IDBKeyRange = window.IDBKeyRange || window.mozIDBKeyRange || window.webkitIDBKeyRange || window.msIDBKeyRange;
    // 数据库实例
    db = null;
    
    /**
     * 判断类型
     * @param val
     * @returns {string}
     * @private
     */
    _typeof(val) {
        return Object.prototype.toString.call(val);
    }
    
    /**
     * 判断浏览器是否支持indexedDB, 返回boolean
     * @returns {boolean}
     */
    isSupported() {
        if (this.DB) {
            return true;
        } else {
            console.error(`Your browser doesn't support IndexedDB!`);
            return false;
        }
    }
    
    /**
     * 删除数据库
     * @returns {Promise}
     */
    delDB() {
        this.close();
        return new Promise((resolve, reject) => {
            const request = this.DB.deleteDatabase(this.database);
            request.onsuccess = e => {
                resolve(e.target.readyState);
            };
            request.onerror = e => {
                reject(e.target.error);
            };
        })
    }
    
    /**
     * 打开数据库,传入store判断objectStore是否存在
     * @param store
     * @returns {Promise}
     * @private
     */
    _open(store) {
        return new Promise((resolve, reject) => {
            this.close();
            const request = this.DB.open(this.database, Date.now());
            request.onerror = e => {
                this.db = null;
                reject(e.target.error);
            };
            request.onsuccess = e => {
                if (store && !request.result.objectStoreNames.contains(store)) {
                    reject(`IndexedDB's objectStore '${store}' isn't existed.`);
                }
                this.db = request.result;
                resolve(request.result);
            };
            /*request.onblocked = e => {
                console.warn('The IndexedDB version of other tabs are outdated!');
            };*/
        });
    }
    
    /**
     * 关闭数据库
     */
    close() {
        if (this.db) {
            this.db.close();
            this.db = null;
        }
    }
    
    /**
     * 判断数据库中是否存在objectStore
     * @param store
     * @returns {Promise}
     */
    hasStore(store) {
        return new Promise(async (resolve, reject) => {
            this.close();
            const request = this.DB.open(this.database, Date.now());
            request.onsuccess = e => {
                this.db = request.result;
                resolve(request.result.objectStoreNames.contains(store));
            };
            request.onerror = e => {
                this.db = null;
                reject(e.target.error);
            };
        });
    }
    
    /**
     * 创建objectStore, 建议使用索引
     * @param store  必选. 需要创建的objectStore的名字
     * @param index  可选. 需要创建objectStore索引时传入,key为字段名,value为boolean表示是否允许重复
     * @param replace  可选. 如果表存在是否先删除再创建, 默认不删除不创建
     * @param key   可选. 主键名, 对应每条数据必须为包含keyPath属性的对象; 不传则使用主键自增(默认从1开始, 如果之前有number类型的主键, 会去掉最大一个number类型主键的小数然后加1作为自增后的主键)
     * @returns {Promise}
     */
    addStore(store, index, replace = false, key) {
        return new Promise(async (resolve, reject) => {
            if (!store) {
                reject(`The first param can't be empty!`)
            }
            this.close();
            const request = this.DB.open(this.database, Date.now());
            request.onupgradeneeded = e => {
                let db = e.currentTarget.result;
                if (db.objectStoreNames.contains(store)) {
                    if (!replace) {
                        return false;
                    }
                    db.deleteObjectStore(store);
                }
                let objectStore = key ? db.createObjectStore(store, {keyPath: key}) : db.createObjectStore(store, {autoIncrement: true});
                if (this._typeof(index) === '[object Object]') {
                    for (let key in index) {
                        if (index.hasOwnProperty(key)) {
                            objectStore.createIndex(key, key, {unique: !!index[key]});
                        }
                    }
                }
            };
            request.onerror = e => {
                this.db = null;
                reject(e.target.error);
            };
            request.onsuccess = e => {
                this.db = request.result;
                resolve(request.result);
            };
            /*request.onblocked = e => {
                console.warn('The IndexedDB version of other tabs are outdated!');
            };*/
        });
    }
    
    /**
     * 删除objectStore
     * @param store
     * @returns {Promise}
     */
    delStore(store) {
        return new Promise(async (resolve, reject) => {
            this.close();
            const request = this.DB.open(this.database, Date.now());
            request.onupgradeneeded = e => {
                let db = e.currentTarget.result;
                if (db.objectStoreNames.contains(store)) {
                    db.deleteObjectStore(store);
                }
            };
            request.onerror = e => {
                this.db = null;
                reject(e.target.error);
            };
            request.onsuccess = e => {
                this.db = request.result;
                resolve(request.result);
            };
            /*request.onblocked = e => {
                console.warn('The IndexedDB version of other tabs are outdated!');
            };*/
        });
    }
    
    /**
     * 返回游标范围
     * @param start  索引的起始值
     * @param end  索引的结束值
     * @returns {*}
     * @private
     */
    _getRange(start, end) {
        if (typeof start === 'undefined' && typeof end === 'undefined') {
            return undefined;
        }
        if (typeof start !== 'undefined' && typeof end === 'undefined') {
            return this.IDBKeyRange.upperBound(start);
        }
        if (typeof start === 'undefined' && typeof end !== 'undefined') {
            return this.IDBKeyRange.lowerBound(end);
        }
        if (typeof end === 'boolean') {
            return end ? this.IDBKeyRange.upperBound(start) : this.IDBKeyRange.lowerBound(start);
        }
        return end === start ? this.IDBKeyRange.only(start) : this.IDBKeyRange.bound(start, end);
    }
    
    /**
     * 根据主键值key来获取数据, resolve查到的数据
     * @param store
     * @param key
     * @returns {Promise}
     */
    get(store, key) {
        return new Promise(async (resolve, reject) => {
            try {
                const db = await this._open(store);
                const transaction = db.transaction([store], 'readonly');
                const objectStore = transaction.objectStore(store);
                const request = objectStore.get(key);
                request.onsuccess = e => {
                    let result = e.target.result;
                    this.close();
                    resolve(result);
                };
                request.onerror = e => {
                    reject(e.target.error);
                };
            } catch (err) {
                reject(err);
            }
        });
    }
    
    /**
     * 通过游标来获取指定索引跟范围的值,成功会resolve查到的数据(Array)
     * 对有建立索引的objectStore, 建议使用游标来查询
     * @param store   必选. 需要查询数据的objectStore名
     * @param index  必选. 索引名
     * @param start  可选. 索引的起始值, 查询表中所有数据start和end都不传即可; 只查询大于start的数据, end不传即可
     * @param end  可选. 索引结束值, 只查单个索引,传入跟start相同的值即可;查询所有小于end的数据, start传入undefined或start传入结束值,同时end传入false
     * @param direction 可选, 默认next. 光标的遍历方向, 值为以下4个: 'next'(下一个),'nextunique'(下一个不包括重复值),'prev'(上一个),'prevunique'(上一个不包括重复值)
     * @returns {Promise}
     */
    find(store, index, start, end, direction) {
        return new Promise(async (resolve, reject) => {
            try {
                const db = await this._open(store);
                const transaction = db.transaction([store], 'readonly');
                const objectStore = transaction.objectStore(store);
                const indexObj = objectStore.index(index);
                let range = this._getRange(start, end);
                const directionArr = ['next', 'nextunique', 'prev', 'prevunique'];
                if (!directionArr.includes(direction)) {
                    direction = 'next';
                }
                let request = indexObj.openCursor(range, direction);
                let result = [];
                request.onsuccess = e => {
                    let cursor = e.target.result;
                    if (cursor) {
                        // console.log(cursor)
                        // result.push({primaryKey: cursor.primaryKey, ...cursor.value});
                        result.push(cursor.value);
                        cursor.continue();
                    } else {
                        this.close();
                        resolve(result);
                    }
                };
            }
            catch
                (err) {
                reject(err);
            }
        });
    }
    
    /**
     * 通过游标来获取指定索引跟范围的值,成功会resolve({total: Number //总条数, list: Array //列表数据})
     * @param store   必选. 需要查询数据的objectStore名
     * @param index  必选. 索引名
     * @param start  可选. 索引的起始值, 查询表中所有数据start和end都不传即可; 只查询大于start的数据, end不传即可
     * @param end  可选. 索引结束值, 只查单个索引,传入跟start相同的值即可;查询所有小于end的数据, start不传即可
     * @param page 可选, 默认1. 页码, Number
     * @param num 可选, 默认10. 每页有多少条数据, Number
     * @param direction 可选, 光标的遍历方向, 值为以下4个: 'next'(下一个),'nextunique'(下一个不包括重复值),'prev'(上一个),'prevunique'(上一个不包括重复值)
     * @returns {Promise}
     */
    findPage({store, index, start, end, page = 1, num = 10, direction}) {
        return new Promise(async (resolve, reject) => {
            try {
                page = parseInt(page);
                num = parseInt(num);
                if (isNaN(page) || isNaN(num) || page < 1 || num < 1) {
                    reject('The page and num parameters must be number and greater than 0');
                }
                const db = await this._open(store);
                const transaction = db.transaction([store], 'readonly');
                const objectStore = transaction.objectStore(store);
                const indexObj = objectStore.index(index);
                let range = this._getRange(start, end);
                const directionArr = ['next', 'nextunique', 'prev', 'prevunique'];
                if (!directionArr.includes(direction)) {
                    direction = 'next';
                }
                let request = indexObj.openCursor(range, direction);
                let requestCount = indexObj.count();
                let total = 0;
                requestCount.onerror = e => {
                    reject(e.target.error);
                };
                requestCount.onsuccess = e => {
                    total = e.target.result;
                    if (total <= num * (page - 1)) {
                        this.close();
                        resolve({
                            total,
                            list: []
                        });
                    }
                };
                let cursorNum = 0;
                let list = [];
                request.onsuccess = e => {
                    let cursor = e.target.result;
                    cursorNum++;
                    if (cursor && cursorNum <= page * num) {
                        if (cursorNum > num * (page - 1)) {
                            list.push(cursor.value);
                        }
                        cursor.continue();
                    } else {
                        this.close();
                        resolve({
                            total,
                            list
                        });
                    }
                };
            }
            catch
                (err) {
                reject(err);
            }
        });
    }
    
    /**
     * 查询objectStore中的数据总条数
     * @param store  必选. 需要查询数据的objectStore名
     * @param start  可选. 索引的起始值, 查询表中所有数据start和end都不传即可; 只查询大于start的数据, end不传即可
     * @param end  可选. 索引结束值, 只查单个索引,传入跟start相同的值即可;查询所有小于end的数据, start传入undefined或start传入结束值,同时end传入false
     * @returns {Promise}
     */
    count(store, start, end) {
        return new Promise(async (resolve, reject) => {
            try {
                const db = await this._open(store);
                const transaction = db.transaction([store], 'readonly');
                const objectStore = transaction.objectStore(store);
                
                let request = objectStore.count(this._getRange(start, end));
                request.onerror = e => {
                    reject(e.target.error);
                };
                request.onsuccess = e => {
                    this.close();
                    resolve(e.target.result);
                };
            } catch (err) {
                reject(err);
            }
        });
    }
    
    /**
     * 添加/修改数据, 成功会resolve添加/修改的key
     * @param objectStore
     * @param val
     * @param key
     * @returns {Promise}
     * @private
     */
    _set(objectStore, val, key) {
        return new Promise(async (resolve, reject) => {
            let _key = key;
            if (objectStore.keyPath === null) {
                _key = this._typeof(val) === '[object Object]' && Reflect.has(val, key) ? val[key] : key;
            } else {
                if (this._typeof(val) === '[object Object]' && Reflect.has(val, objectStore.keyPath)) {
                    _key = undefined;
                } else {
                    return reject(`The object store uses in-line keys and the key parameter was provided`);
                }
            }
            let request = _key ? objectStore.put(val, _key) : objectStore.put(val);
            request.onsuccess = e => {
                resolve(e.target.result);
            };
            request.onerror = e => {
                reject(e.target.error);
            };
        });
    }
    
    /**
     * 添加/修改数据, 成功会resolve添加/修改的key
     * @param store  必选. 需要添加/修改数据的objectStore名
     * @param val  必选. 添加/修改的数据, 如果为数组会遍历该数组, 每个元素作为一条数据进行添加/修改. 如果添加objectStore有指定主键,那么val必须为包含主键属性的对象或数组中每个元素都为为包含主键属性的对象
     * @param key  可选. 如果有指定keyPath, 该值会被忽略. 如果val为对象或数组中元素为对象, 可以是其中的属性名
     * @param arrSpread 数组是否遍历后存储
     * @returns {Promise}
     */
    set(store, val, key, arrSpread = true) {
        return new Promise(async (resolve, reject) => {
            try {
                const db = await this._open(store);
                const transaction = db.transaction([store], 'readwrite');
                const objectStore = transaction.objectStore(store);
                if (this._typeof(val) === '[object Array]' && arrSpread) {
                    let result = [];
                    for (let item of val) {
                        result.push(await this._set(objectStore, item, key));
                    }
                    this.close();
                    resolve(result);
                } else {
                    let result = await this._set(objectStore, val, key);
                    this.close();
                    resolve(result);
                }
            } catch (err) {
                reject(err);
            }
        });
    }
    
    /**
     * 删除objectStore中的数据, 成功会resolve('done')
     * @param store  必选. 需要删除数据的objectStore名
     * @param start  必选. 主键的值(end不传)/起始值(end传入true)/结束值(end传入false)
     * @param end  可选. 主键结束值
     * @returns {Promise}
     */
    del(store, start, end) {
        return new Promise(async (resolve, reject) => {
            try {
                const db = await this._open(store);
                const transaction = db.transaction([store], 'readwrite');
                const objectStore = transaction.objectStore(store);
                let request = typeof end === 'undefined' ? objectStore.delete(start) : objectStore.delete(this._getRange(start, end));
                request.onsuccess = e => {
                    this.close();
                    resolve(e.target.readyState);
                };
                request.onerror = e => {
                    reject(e.target.error);
                };
            } catch (err) {
                reject(err);
            }
        });
    }
    
    /**
     * 清空objectStore中的数据, 成功会resolve('done')
     * @param store
     * @returns {Promise}
     */
    clear(store) {
        return new Promise(async (resolve, reject) => {
            try {
                const db = await this._open(store);
                const transaction = db.transaction([store], 'readwrite');
                const objectStore = transaction.objectStore(store);
                const request = objectStore.clear();
                request.onsuccess = e => {
                    this.close();
                    resolve(e.target.readyState);
                };
                request.onerror = e => {
                    reject(e.target.error);
                };
            } catch (err) {
                reject(err);
            }
        });
    }
}