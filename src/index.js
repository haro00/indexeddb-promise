export default class IndexedDB {

    constructor(name) {
        // 数据库名
        this.database = name;
        // 数据库对象
        this.DB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
        // 游标范围
        this.IDBKeyRange = window.IDBKeyRange || window.mozIDBKeyRange || window.webkitIDBKeyRange || window.msIDBKeyRange;
        // 数据库实例
        this.db = null;
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
     * @param obj  可选. 需要创建objectStore索引时传入,key为字段名,value为boolean表示是否允许重复
     * @param replace  可选. 如果表存在是否先删除再创建, 默认不删除不创建
     * @param keyPath   可选. 主键名, 如果有传入, 那么对应每条数据必须为包含keyPath属性的对象
     * @returns {Promise}
     */
    addStore(store, obj, replace = false, keyPath = '') {
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
                let objectStore = keyPath ? db.createObjectStore(store, {keyPath}) : db.createObjectStore(store);
                if (Object.prototype.toString.call(obj) === '[object Object]') {
                    for (let key in obj) {
                        if (obj.hasOwnProperty(key)) {
                            objectStore.createIndex(key, key, {unique: !!obj[key]});
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
     * @param start  // 索引的起始值(end传入true)/结束值(end传入false)
     * @param end  // 索引的结束值(只查单个索引的key,传入跟start相同的值即可)
     * @returns {*}
     * @private
     */
    _getRange(start, end = true) {
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
     * @param indexName  必选. 索引名
     * @param start  可选. 索引的起始值(end传入true)/结束值(end传入false), start为undefined(即不传)查询表中所有数据
     * @param end  可选. 索引结束值(只查单个索引的key,传入跟start相同的值即可), 默认true
     * @returns {Promise}
     */
    find(store, indexName, start, end = true) {
        return new Promise(async (resolve, reject) => {
            try {
                const db = await this._open(store);
                const transaction = db.transaction([store], 'readonly');
                const objectStore = transaction.objectStore(store);
                const index = objectStore.index(indexName);
                let request = start === undefined ? index.openCursor() : index.openCursor(this._getRange(start, end));
                let result = [];
                request.onerror = e => {
                    reject(e.target.error);
                };
                request.onsuccess = e => {
                    let cursor = e.target.result;
                    if (cursor) {
                        result.push(cursor.value);
                        // 遍历游标
                        cursor.continue();
                    } else {
                        this.close();
                        resolve(result);
                    }
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
            let request = null;
            if (objectStore.keyPath === null) {
                request = Object.prototype.toString.call(val) === '[object Object]' && Reflect.has(val, key) ? objectStore.put(val, val[key]) : objectStore.put(val, key);
            } else {
                if (Object.prototype.toString.call(val) === '[object Object]' && Reflect.has(val, objectStore.keyPath)) {
                    request = objectStore.put(val);
                } else {
                    reject(`The object store uses in-line keys and the key parameter was provided`);
                }
            }
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
     * @param key  如果有指定keyPath, 该值会被忽略, 否则必选. 如果val为对象或数组中元素为对象, 可以是其中的属性名
     * @returns {Promise}
     */
    set(store, val, key) {
        return new Promise(async (resolve, reject) => {
            try {
                const db = await this._open(store);
                const transaction = db.transaction([store], 'readwrite');
                const objectStore = transaction.objectStore(store);
                if (Object.prototype.toString.call(val) === '[object Array]') {
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
     * @param end  可选. 主键结束值, 默认true
     * @returns {Promise}
     */
    del(store, start, end) {
        return new Promise(async (resolve, reject) => {
            try {
                const db = await this._open(store);
                const transaction = db.transaction([store], 'readwrite');
                const objectStore = transaction.objectStore(store);
                let request = end === undefined ? objectStore.delete(start) : objectStore.delete(this._getRange(start, end));
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