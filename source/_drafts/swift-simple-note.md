---
title: Swift简略笔记
tags: swift
categories: swift
---

## 主旨

超简略笔记
忽略各个细节
只记录最基础最常用方法

<!-- more -->

## 基础

- `var`,变量
- `let`,常量
- 可选参数
```swift
var a = "1a23"
var b = Int(a)
if b != nil {
        print(b!)
} else {
        print("b is nil")
}
print("abc\(b ?? 456)")
```
- `assert`,断言

## 异常处理

- 函数抛出`func abc() throws {}`
- 函数调用`try abc()`
- 捕获异常`do catch`

## 字符串

- 长度`字符串.count`
- 竟然不能中括号截取字符串,太原始了.
```swift
var a = "abcde"
print(a.count)
for i in a.indices {
        print(i, a[i])
}
a.insert("!", at : a.endIndex)
print(a)
print(a.remove(at:a.startIndex))
print(a)
print(a.removeSubrange(a.index(a.endIndex, offsetBy:-2)..<a.endIndex))
print(a)
```

## 集合类型

- 数组,Array,`[]`,起始索引为0
	- `append()`,`+`操作符实现了append的功能
	- `arr[2...3] = [2, 3]`,可以直接批量修改连续内容
	- `insert(内容,at:索引)`
	- `remove(at:索引)`,`removeLast()`
	- `enumerate()`可以遍历,for中可以使用`(index, value)`
- Set,`Set<T>()`,`var a:Set = [1,2,3]`
	- `insert()`
	- `变量 = []`清空内容
	- `contains()`
	- 交集`intersection()`
	- 差集`subtracting()`
	- 并集`union()`
	- 补集`symmetricDifference()`
	- 相等`==`
	- 子集`isSubset(of:)`
	- 父集`isSuperset(of:)`
	- 无重复元素`isDisjoint(with:)`
- Dictionary,`[类型:类型]`,`[key:value,...]`
```swift
var a = ["a":"aaa","b":"bbb","c":"ccc"]
print(a)
print(a.isEmpty)
print(a.count)
print(a["b"])
print(a["d"])
a["d"]="ddd"
print(a["d"])
let b = a.updateValue("dddd", forKey:"d")
print(b)
print(a["d"])
a["b"] = nil
let c = a.removeValue(forKey:"d")
print(c)
print(a)
print(a.count)
for key in a.keys {
    print(key)
}
for value in a.values {
    print(value)
}
for (key, value) in a {
    print(key, value)
}
let d = a.keys
print(d)
```
	

### 常用属性

- `isEmpty`
- `count`

## 控制

- 条件
	- `if`
```swift
var a = 1
if a < 1 {
    print("a < 1")
} else if (a == 1) {
    print("a == 1")
} else {
    print("a > 1")
}
```
	- `switch`,必须包含所有可能的情况,否则不能编译通过
		- 可以swich元组
```swift
let a = -1
switch a {
    case 1,2,3:
        print("a")
    case 4,5,6:
        print("b")
    case 7...10:
        print("c")
    default:
        print("d")
}
let a = (1, 2)
switch a {
    case let (x, y) where x + y < 7:
        print(x, y)
    case let (x, y) where x + y > 7:
        print(">7")
    default:
        print("=7")
}
```
	- `guard...else`,可以无视掉,只有条件失败时,会执行else语句块,并且语句块必须中断,返回.不能继续向下执行
```swift
func test(_ a:Int) {
        guard a == 1 else {
            print("a")
                return
        }
    guard a != 1 else {
        print("b")
            return
    }
}
test(1) // b
test(2) // a
```
- 循环
	- `for`
```swift
for i in 1..<5 {
    print(i)
}
var a = ["a":"aaa","b":"bbb","c":"ccc"]
for (k,v) in a {
    print(k, v)
}
for i in stride(from:0, to:3, by:1) {
    print(i)
}
```
	- `while`
```swift
var i = 0
while i < 5 {
    i+=1
    print(i)
}
repeat {
    print(i)
    i-=1
} while (i > 0)
```
- 转移
	- `break`,标准功能,可以用于空的switch分支
	- `continue`,标准功能
	- `fallthrough`,switch用,跨case的
	- `return`,标准功能

## 函数

- 返回值可以iwei可选参数
- 参数没有label则默认使用参数名
```swift
func fa(_ a:String) -> String {
    let b = a + a
    return b
}
print(fa("a"))
```
- 可变长度参数
```swift
func fb(a:Int...) -> Int {
    var sum = 0
    for i in a {
        sum += i
    }
    return sum
}
print(fb(a:1,2,3,4,5))
```
- 引用传参,`inout`关键字,调用时要使用`&`符号
```swift
func fc(a:inout Int) -> Int {
    a += a
    return a
}
var a = 10
print(fc(a:&a))
print(a)
```
- 变量参数,语法本身不支持,可以使用`inout`替代(可能会引起问题),最好还是使用新的var变量来复制一份参数使用
- 函数返回值
```swift
func fd(a:Int) -> () -> String {
    if a == 1 {
        func fe() -> String { return "a" }
        return fe
    } else {
        func ff() -> String { return "b" }
        return ff
    }
}

var a = fd(a:1)
print(a)
print(a())
a = fd(a:2)
print(a)
print(a())
```
- 闭包
```swift
func count() -> ()->Int {
    var a = 0
    func f() -> Int {
        a+=1
        return a
    }
    return f
}

var a = count()
var b = count()
print(a())
print(a())
print(b())
print(b())
print(a())
print(b())
```
- lambda表达式
	- 只有一行代码时,默认返回改行代码的值
	- 否则需要显示调用`return`语句返回
```swift
let a = [5,1,4,2,3]
let b = a.sorted(by:{(a:Int,b:Int)->Bool in a > b })
print(b)
```
	- 因为参数和返回值类型都可以自动推断,所以代码可以简化
```swift
let a = [5,1,4,2,3]
let b = a.sorted(by:{x, y in x > y})
print(b)
```
	- lambda中的参数提供了默认的参数名:`$0`,`$1`,`$2`...,可以直接省略参数定义和`in`
```swift
let a = [5,1,4,2,3]
let b = a.sorted(by:{$0 < $1})
print(b)
```
	- 调用默认的`>`实现
```swift
let a = [5,1,4,2,3]
let b = a.sorted(by:>)
print(b)
```
	- 当只有一个参数,并且为lambda时,可以省略括号
```swift
let a = [5,1,4,2,3]
let b = a.map{$0*10}
print(b)
```

## 枚举

- 和C不一样
```swift
enum ETEST {
    case A
    case B
    case C
}
print(ETEST.A)
print(ETEST.B)
```
- 可以存储变量值,同时还像一个组合
```swift
enum ETEST {
    case A(Int,Int)
    case B(String)
}

var a = ETEST.A(10,20)
a = ETEST.B("abcde")
switch a {
    case let .A(x,y):
        print("-:",x,y)
    case let .B(s):
        print("+:",s)
}
```
- Int类型默认起始为0
```swift
enum ETEST : Int {
    case a
    case b
    case A
    case B
    case C
    case D
}

let a = ETEST.C
print(a)
print(a.rawValue)
print(a.hashValue)
// 可以这样用
enum ETEST : Int {
    case A = 1
    case B
    case C
    case D
}

let a = ETEST.C
print(a)
print(a.rawValue)
print(a.hashValue)
```

## 类和结构体

- 类和结构体的区别
	- 传参的时候,结构体是值传递(完全拷贝),类是引用传递
	- 结构体不能被继承

### 值类型

- 结构体(以下类型都是使用结构体实现的,所以传参时都是完全拷贝)
	- 整数
	- 浮点数
	- 布尔型
	- 数组
	- 集合
	- 字典
	- 枚举

### 属性

#### 存储属性

- 类中的`var`,`let`定义的属性
- 类定义时可以直接使用`=`初始化
- `lazy`,减少内存占用,只在使用对一个属性时进行初始化
```swift
class A {
    var a = 1
}
class B {
    lazy var a = A()
}

var a = B()
print(a.a.a)
```

#### 计算属性

- 在属性后使用`{}`包含对应的方法
- 使用`get`/`set`方法
- 在`set`中默认使用`newValue`来获取参数值
```swift
class A {
    var a = 1
    var b : Int {
        get {
            return a * 2
        }
        set {
            a = newValue / 2
        }
    }
}
var a = A()
print(a.a)
print(a.b)
a.a = 10
print(a.a)
print(a.b)
a.b=40
print(a.a)
print(a.b)
```
- 当只有`get`时,可以省略一层函数封装
```swift
class A {
    var a = 1
    var b : Int {
        return a * 2
    }
}
var a = A()
print(a.a)
print(a.b)
```
- 属性观察器,会在属性被设置前/后调用,参数值分别为`newValue`和`oldValue`
```swift
class A {
    var a = 1 {
        willSet {
            print("cur", a, "new", newValue)
        }
        didSet {
            print("old", oldValue, "cur", a)
        }
    }
}
var a = A()
print(a.a)
a.a = 10
print(a.a)
```
- 静态属性,只能使用`类型.属性`来访问
```swift
class A {
    static var a = 1
    var b : Int {
        get {
            return A.a
        }
        set {
            A.a = newValue
        }
    }
}
print(A.a)
var a = A()
print(a.b)
a.b=10
print(A.a)
print(a.b)
```

## 方法

- 基本方法调用
```swift
class A {
    var a = 0
    func f(b:Int) {
        a = b
    }
    func f1(a:Int) {
        self.a = a
    }
}
var a = A()
print(a.a)
a.f(b:5)
print(a.a)
a.f1(a:8)
print(a.a)
```
- struct中的方法
	- 调用自己的属性必须使用`self`
	- 修改自己的值必须使用`mutating func`
```swift
struct A {
    var a = 0
    mutating func f(a:Int) {
        self.a = a
    }
}
var a = A()
print(a.a)
a.f(a:5)
print(a.a)
```
- enum中的方法和struct一样
```swift
enum E : String {
    case A, B, C
    mutating func t() {
        print("cur:\(self)")
        switch self {
            case .A:
                self = .B
            case .B:
                self = .C
            case .C:
                self = .A
        }
    }
}
var a = E.A
print(a)
a.t()
print(a)
a.t()
print(a)
a.t()
print(a)
a.t()
print(a)
```
- 静态方法
```swift
class A {
    static func f() {
        print("A::f")
    }
}
A.f()
```

## 下标

**本质就是重写`[]`运算符的方法**
- 就是通过类似索引的方式访问或设置属性
```swift
class A {
    var a = 0
    var b = 0
    subscript (index:Int) -> Int {
        get {
            switch index {
                case 0:
                    return a
                case 1:
                    return b
                default:
                    return 0
            }
        }
        set {
            switch index {
                case 0:
                    a = newValue
                case 1:
                    b = newValue
                default:
                    break
            }
        }
    }

}
var a = A()
print(a[0])
print(a[1])
a[0]=10
a[1]=22
print(a[0])
print(a[1])
```
- 举个例子
	- 计算原型面积
```swift
struct CircleArea {
    subscript (r:Double)->Double {
       return Double.pi * r * r
    }
}
var c = CircleArea()
print(c[10])
print(c[100])
```
	- 矩阵
```swift
class Mt {
    var columns = 0, rows = 0
    var data:[Int]
    init(row:Int, col:Int) {
        columns = col
        rows = row
        data = Array(repeating:0, count:row*col)
    }
    func isIndexValid(row:Int, col:Int) -> Bool {
        return col >= 0 &&
            col < columns &&
            row >= 0 &&
            row < rows
    }
    subscript (row:Int, col:Int) -> Int {
        get {
            assert(isIndexValid(row:row, col:col), "invalid index[\(row),\(col)]")
            return data[columns*row+col]
        }
        set {
            assert(isIndexValid(row:row, col:col), "invalid index[\(row),\(col)]")
            data[columns*row+col]=newValue
        }
    }
    func test() {
        print(data)
    }
}

var m = Mt(row:3,col:3)
for i in 0..<3 {
    for j in 0..<3 {
        m[i,j] = i+j
    }
}

for i in 0..<3 {
    for j in 0..<3 {
        print(i, j, m[i,j])
    }
}

m.test()
```

## 继承

