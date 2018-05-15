# indexeddb-promise

IndexedDB的所有操作都是异步的，API都是在回调函数中执行的，为了便于对其进行操作，使用ES6中的`Promise`来封装。

## 1. 安装

#### npm包

```
// use npm
npm install --save-dev indexeddb-promise
// use yarn
yarn add --dev indexeddb-promise

```

#### script引入

`IndexedDB` 会被注册为一个全局变量。建议链接到一个可以手动更新的指定版本号：

```
<script src="https://cdn.jsdelivr.net/npm/indexeddb-promise@1.1.1/dist/index.js"></script>
```

## 2. 使用

```
import IndexedDB from 'indexeddb-promise'

const db = new IndexedDB('yourDatabaseName');
```

## 3. API

除isSupport()方法外都是返回promise

#### db.isSupported()

判断浏览器是否支持indexedDB, 返回boolean

#### db.delDB()

删除数据库

#### db.hasStore(store)

判断数据库中是否存在objectStore

#### db.addStore(store, index, replace, keyPath)

* store: 必选. 需要创建的objectStore的名字
* index: 可选, Object. 需要创建objectStore索引时传入,key为字段名,value为boolean表示是否允许重复
* replace: 可选. 如果objectStore存在否先删除再创建, 默认不删除不创建
* keyPath: 可选. 主键名, 对应每条数据必须为包含keyPath属性的对象; 不传则使用主键自增(默认从1开始, 如果之前有number类型的主键, 会去掉最大一个number类型主键的小数然后加1作为自增后的主键)

创建objectStore, 建议使用索引

#### db.delStore(store)

删除objectStore

#### db.get(store, key)

根据主键值key来获取数据, resolve查到的数据

#### db.find(store, index, start, end, direction)

* store: 必选. 需要查询数据的objectStore名
* index: 必选. 索引名
* start: 可选. 索引的起始值, 查询表中所有数据start和end都不传即可; 只查询大于start的数据, end不传即可
* end: 可选. 索引结束值, 只查单个索引,传入跟start相同的值即可;查询所有小于end的数据, start传入undefined或start传入结束值,同时end传入false
* direction: 可选, 光标的遍历方向, 值为以下4个: 'next'(下一个),'nextunique'(下一个不包括重复值),'prev'(上一个),'prevunique'(上一个不包括重复值)

通过游标来获取指定索引跟范围的值, 成功会resolve查到的数据
 
对有建立索引的objectStore, 建议使用游标来查询

#### db.findPage({store, index, start, end, page, num, direction})

* store: 必选. 需要查询数据的objectStore名
* index: 必选. 索引名
* start: 可选. 索引的起始值, 查询表中所有数据start和end都不传即可; 只查询大于start的数据, end不传即可
* end: 可选. 索引结束值, 只查单个索引,传入跟start相同的值即可;查询所有小于end的数据, start不传即可
* page: 可选. 页码, Number, 查询分页数据必选且大于0
* num: 可选. 每页有多少条数据, Number, 默认0, 查询分页数据必选且大于0
* direction: 可选, 光标的遍历方向, 值为以下4个: 'next'(下一个),'nextunique'(下一个不包括重复值),'prev'(上一个),'prevunique'(上一个不包括重复值)

可选参数较多, 使用对象传参. 通过游标来获取指定索引跟范围的分页数据, 成功会resolve({total: Number //总条数, list: Array //列表数据})

#### db.count(store, start, end)

* store: 必选. 需要统计数据的objectStore名
* start: 可选. 索引的起始值, 查询表中所有数据start和end都不传即可; 只查询大于start的数据, end不传即可
* end: 可选. 索引结束值, 只查单个索引,传入跟start相同的值即可;查询所有小于end的数据, start传入undefined或start传入结束值,同时end传入false

查询objectStore中的数据总条数

#### db.set(store, val, key, arrSpread)

* store: 必选. 需要添加/修改数据的objectStore名
* val: 必选. 添加/修改的数据, 如果为数组会遍历该数组, 每个元素作为一条数据进行添加/修改. 如果添加objectStore有指定主键,那么val必须为包含主键属性的对象或数组中每个元素都为为包含主键属性的对象
* key: 如果有指定keyPath, 该值会被忽略. 如果val为对象或数组中元素为对象, 可以是其中的属性名
* arrSpread: 可选, 默认为true. 数组是否遍历后存储

添加/修改数据, 成功会resolve添加/修改的key

#### db.del(store, start, end)

* store: 必选. 需要删除数据的objectStore名
* start: 必选. 主键的值(end不传)/起始值(end传入true)/结束值(end传入false)
* end: 可选. 主键结束值

删除objectStore中的数据, 成功会resolve('done')

#### db.clear(store)

清空objectStore中的数据, 成功会resolve('done')
