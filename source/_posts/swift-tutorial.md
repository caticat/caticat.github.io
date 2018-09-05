---
title: Swift引导学习笔记
tags:
  - swift
  - tutorial
categories: swift
date: 2018-09-05 14:14:46
---


## 简介

Swift的学习笔记
以下代码可以直接在playground中运行
学习版本:swift 4.2

## Hello World

```swift
print("Hello, world!")
```

关键点

- 不需要引用其他库
- 行尾没有`;`
- 没有`main`函数,编译器会已在全局范围内的代码作为程序入口点
<!-- more -->

## Simple Values

- `let`,常量声明
- `var`,变量声明,**常量可以先声明,随后在使用前初始化一次**

### 总结

- **swift是强类型的,一旦变量类型被确定,就不能改变**
- 不需要手动声明类型,通过初次赋值,编译器可以推断出变量/常量的类型
- 当定义不足以提供所需的数据类型时,可以使用显示的类型定义
```swift
let implicitInteger = 70
let implicitDouble = 70.0
let explicitDouble: Double = 70
```
- 不支持隐式转换,所有不同类型的赋值都需要显示的转换
```swift
let label = "The width is "
let width = 94
let widthLabel = label + String(width)
print(widthLabel)
```
- 可以使用`\(内容)`的方式在字符串中插入其他变量的内容
```swift
let apples = 3
let oranges = 5
let appleSummary = "I have \(apples) apples."
let fruitSummary = "I have \(apples + oranges) pieces of fruits."
let a = "test"
let b = "This is a \(a)."
print(appleSummary)
print(fruitSummary)
print(b, b)
let c = 2.5
let d = 1.23333
let e = "This is a \(c + d + 3.1 + 10)."
print(e)
```
- 使用三个双引号包围可以创建多行字符串,同时可以使用特殊字符而不需要转义(替换变量/常量功能依然有效)
```swift
let quotation = """
I said "I have \(apples) apples."
And then I said "I have \(apples + oranges) pieces of fruit."
"""
```
- 使用中括号`[]`来定义/声明数组和字典,使用索引或key来访问/修改元素,最后一个元素结尾可以有`,`
```swift
var shoppingList = ["catfish", "water", "tulips", "blue paint"]
shoppingList[1] = "bottle of water"

var occupations = [
	"Malcolm": "Captain",
	"Kaylee": "Mechanic",
]
occupations["Jayne"] = "Public Relations"
```
- 创建空数组或字典,需要使用初始化语法
```swift
let emptyArray = [String]()
let emptyDictionary = [String: Float]()
```
- 如果数组或字典的类型可以被编译器推断出来则可以直接使用`[]`,`[:]`来初始化数组和字典.(不知道怎么使用,据说是传参数或者设置变量时可以这样用)
```swift
shoppingList = []
occupations = [:]
```

## Control Flow

简介

- `if`/`switch`,条件控制
- `for-in`/`while`/`repeat-while`,循环
- 条件的`()`/`循环变量`可以省略
- 执行代码的`{}`不能省略

```swift
let individualScores = [75, 43, 103, 87, 12]
var teamScore = 0
for score in individualScores {
	if score > 50 {
		teamScore += 3
	} else {
		teamScore += 1
	}
}
print(teamScore)
```

### if

判断条件并执行代码

- 条件必须是bool类型
- 不会隐式和0做比较
- 在类型之后使用`?`来表示该变量为可选变量(可以有值或为`nil`)
- 可以使用`if`+`let`判断可选参数是否为空
```swift
var a:Bool? = false
if let a = b {
	print(1, a) // 会进入这个条件
} else {
	print(2)
}
```
```swift
var optionalString: String? = "Hello"
print(optionalString == nil)

var optionalName: String? = "John Appleseed"
var greeting = "Hello!"
if let name = optionalName {
    greeting = "Hello, \(name)"
}
```
- 可以使用`??`来为可选变量设置默认值
```swift
let nickName: String? = nil
let fullName: String = "John Appleseed"
let informalGreeting = "Hi \(nickName ?? fullName)"
print(informalGreeting) 
```

### switch

- 支持比较判断
- case支持赋值函数判断
- case内不需要break
- case支持使用`,`来表示或操作
- 必须有default语句(所有的case包含了所有情况的话,则不需要default)

```swift
let vegetable = "red pepper"
switch vegetable {
case "celery":
    print("Add some raisins and make ants on a log.")
case "cucumber", "watercress":
    print("That would make a good tea sandwich.")
case let x where x.hasSuffix("pepper"):
    print("Is it a spicy \(x)?")
default:
    print("Everything tastes good in soup.")
}
```

### for-in

```swift
let interestingNumbers = [
    "Prime": [2, 3, 5, 7, 11, 13],
    "Fibonacci": [1, 1, 2, 3, 5, 8],
    "Square": [1, 4, 9, 16, 25],
]
var largest = 0
var largestKind = ""
for (kind, numbers) in interestingNumbers {
    for number in numbers {
        if number > largest {
            largest = number
            largestKind = kind
        }
    }
}
print(largest, largestKind)
```

### for

- `..<`,遍历不包含上限
- `...`,遍历包含上限

```swift
var total = 0
for i in 0..<4 {
    total += i
}
print(total)

for i in 0...4 {
    print(i)
}
```

### while

```swift
var n = 2
while n < 100 {
	n *= 2
}
print(n)

var m = 2
repeat {
	m *= 2
} while m < 100
print(m)
```

## Functions and Closures

### func

函数调用的参数有一个标签的概念,
调用函数需要指定参数的标签进行调用.
默认情况下,是使用参数名来作为标签.
可以使用`_`来表示不使用标签,
可以在参数名前增加标签的名字(用空格分隔)
当添加标签后,原始的参数名将不能作为函数参数标签使用
(标签并不能改变参数的调用顺序,还是需要从前向后一次传参)

#### 默认标签的使用

```swift
func greet(person: String, day: String) -> String {
    return "Hello \(person), today is \(day)."
}
let res = greet(person: "Bob", day: "Tuesday")
print(res)
```

#### 标签的常规调用

```swift
func greet(_ person: String, on day: String) -> String {
    return "Hello \(person), today is \(day)."
}
greet("John", on: "Wednesday")
```

#### 函数的多返回

- 返回值使用tuple的方式返回
- 获取返回值的内容既可以使用返回的参数名,又可以使用索引

```swfit
func calculateStatistics(scores: [Int]) -> (min: Int, max: Int, sum: Int) {
    var min = scores[0]
    var max = scores[0]
    var sum = 0

    for score in scores {
        if score > max {
            max = score
        } else if score < min {
            min = score
        }
        sum += score
    }

    return (min, max, sum)
}
let statistics = calculateStatistics(scores: [5, 3, 100, 3, 9])
print(statistics.sum)
print(statistics.2)
```

#### 局部函数

局部函数可以使用外部的变量
可以用于实现一些复杂的问题

```swift
func returnFifteen() -> Int {
    var y = 10
    func add() {
        y += 5
    }
    add()
    return y
}
returnFifteen()
```

#### 函数可以作为参数,返回值

```swift
func a() -> ((Int) -> Int) {
	var b = 10
	func c(d : Int) -> Int {
		b += d
		return b
	}
	return c
}

var b = a()
print(b(1))
print(b(2))
print(b(5))
var c = a()
print(c(10))
```

```swift
func hasAnyMatches(list: [Int], condition: (Int) -> Bool) -> Bool {
    for item in list {
        if condition(item) {
            return true
        }
    }
    return false
}
func lessThanTen(number: Int) -> Bool {
    return number < 10
}
var numbers = [20, 19, 7, 12]
hasAnyMatches(list: numbers, condition: lessThanTen)
```

#### 匿名函数

```swfit
func a(i : Int, f : (Int) -> Int) {
    print(f(i))
}
a(i:10, f:{(num : Int) -> Int in
    let r = num * 3
    return r
})
```

#### 匿名函数的参数和返回值可以推断省略

单行函数,会直接返回这行代码执行的结果

```swift
var a = [1, 2, 3]
var b = a.map({ num in num * 3})
print(b)
```

#### 匿名函数中可以使用从0开始的序号来代替参数名

```swift
var a = [3, 1, 2]
var b = a.sorted(by:{$0 < $1})
print(b)
```

## Objects and Classes

- 类的声明
```swift
class Shape {
    var numberOfSides = 0
    func simpleDescription() -> String {
        return "A shape with \(numberOfSides) sides."
    }
}
```
- 类的使用
```swift
var shape = Shape()
shape.numberOfSides = 7
var shapeDescription = shape.simpleDescription()
print(shapeDescription)
```
- 构造函数(init),类属性都必需要初始化,要么在声明中初始化,要么在构造函数中初始化
	- 同名属性和参数使用`self`区分
	- 不能使用`func`做关键字
```swift
class NamedShape {
    var numberOfSides: Int = 0
    var name: String

    init(name: String) {
        self.name = name
    }

    func simpleDescription() -> String {
        return "A shape with \(numberOfSides) sides."
    }
}
```
- 析构函数(deinit),在类生命终止时,需要做的操作
- 子类
	- 不强制继承某个类
	- 调用基类函数使用`super`关键字
	- 覆盖基类函数强制使用`override`关键字
- 属性的setter/getter
	- `set`默认使用`newValue`作为参数名(可以手动设置该参数名)
	- 有`get`/`set`的属性必然是计算属性(不是值属性)
```swift
class Shape {
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

var a = Shape()
print(a.a)
print(a.b)
a.b = 4
print(a.a)
print(a.b)
```
	- `willSet`/`didSet`方法,就是在设置值属性前/后调用的方法,必然是值属性(不是计算属性)
```swift
class Shape {
    var a = 1
    var b : Int {
        willSet {
            print("will set")
        }
        didSet {
            print("did set")
        }
    }
    
    init() {
        b = 10
    }
}

var a = Shape()
print(a.a)
print(a.b)
a.b = 4
print(a.a)
print(a.b)
```
- 可选值的相关使用,如果前面的指针是nil,则后面的内容都不会执行,表达式返回nil
```swift
class A {
    var a = 10
}

// var a: A? = A()
var a: A? = nil
var b = a?.a
print(b)
```

## Enumerations and Structures

### 枚举

- 默认从0开始
- 递增1
- 可以有函数
- 类型可以有字符串,浮点数等
- 使用`rawValue`来访问具体对应的数值
```swift
enum Rank : Int {
    case a = 1
    case b, c, d, e
    case f, g, h
    func simpleDescription() -> String {
        switch self {
            case .a:
                return ":a"
            case .b:
                return ":b"
            case .f:
                return ":f"
            default:
                return String(self.rawValue)
        }
    }
}

var a = Rank.a
var aRawValue = a.rawValue
print(a)
print(aRawValue)
print(a.simpleDescription())
```
- 在枚举外部,调用枚举时需要使用`类型.枚举`
- 当使用`switch`限定了参数的类型时,调用枚举时,只需要使用`.枚举`即可
```swift
enum Suit {
    case spades, hearts, diamonds, clubs
    func simpleDescription() -> String {
        switch self {
        case .spades:
            return "spades"
        case .hearts:
            return "hearts"
        case .diamonds:
            return "diamonds"
        case .clubs:
            return "clubs"
        }
    }
    func color() -> String {
        switch self {
            case .spades, .clubs:
                return "black"
            case .hearts, .diamonds:
                return "red"
        }
    }
}
let hearts = Suit.hearts
let heartsDescription = hearts.simpleDescription()
print(hearts.color())
```
- 相同枚举的实例的值一般是相同的
- **奇怪的代码**,主要是不知道这样写的意义是什么
```swift
enum ServerResponse {
    case result(String, String)
    case failure(String)
}

let success = ServerResponse.result("6:00 am", "8:09 pm")
let failure = ServerResponse.failure("Out of cheese.")

switch success {
case let .result(sunrise, sunset):
    print("Sunrise is at \(sunrise) and sunset is at \(sunset).")
case let .failure(message):
    print("Failure...  \(message)")
}
```

### 结构体

- 结构体和类基本功能一样
- 区别
	- 传参的时候,结构体是值传递(完全拷贝),类是引用传递
```swift
struct Card {
    var rank: Rank
    var suit: Suit
    func simpleDescription() -> String {
        return "The \(rank.simpleDescription()) of \(suit.simpleDescription())"
    }
}
let threeOfSpades = Card(rank: .three, suit: .spades)
let threeOfSpadesDescription = threeOfSpades.simpleDescription()
```

## Protocols and Extensions

### Protocol

- **`protocol`就是`interface`.**
- **swift是单继承,多实现的方式**,只能继承一个类,但是可以同时实现多个接口(protocol),使用`,`分隔
- 使用`protocol`关键字声明协议
```swift
protocol ExampleProtocol {
    var simpleDescription: String { get }
    mutating func adjust()
}
```
- 类,枚举和结构体都可以继承protocol
```swift
class SimpleClass: ExampleProtocol {
    var simpleDescription: String = "A very simple class."
    var anotherProperty: Int = 69105
    func adjust() {
        simpleDescription += "  Now 100% adjusted."
    }
}
var a = SimpleClass()
a.adjust()
let aDescription = a.simpleDescription

struct SimpleStructure: ExampleProtocol {
    var simpleDescription: String = "A simple structure"
    mutating func adjust() {
        simpleDescription += " (adjusted)"
    }
}
var b = SimpleStructure()
b.adjust()
let bDescription = b.simpleDescription
```
- `mutating`关键字用于表示该函数会修改成员属性
	- `class`内部不需要使用该关键字,因为类函数都是修改类内容的

```swift
protocol AProtocol {
    var a : String { get }
    mutating func f()
}

class BClass : AProtocol {
    var a : String = "class var a"
    var b : Int = 10
    func f() {
        a += ";(class)"
    }
}

struct CStruct : AProtocol {
    var a : String = "struct var a"
    var b : Int = 20
    mutating func f() {
        a += ";(struct)"
    }
}

var a = BClass()
a.f()
print(a.a)
var b = CStruct()
b.f()
print(b.a)
let c : AProtocol = a
print(c.a)
// print(c.b) // 报错,AProtocol中没有b属性,即时实际指向的对象是BClass
```

### extension

- 可以为已有类型追加函数
```swift
extension Int: ExampleProtocol {
    var simpleDescription: String {
        return "The number \(self)"
    }
    mutating func adjust() {
        self += 42
    }
}
print(7.simpleDescription)
```
```swift
protocol ExampleProtocol {
    var simpleDescription: String { get }
    mutating func adjust()
}

extension Int: ExampleProtocol {
    var simpleDescription: String {
        return "The number \(self)"
    }
    mutating func adjust() {
        self += 42
    }
}

print(7.simpleDescription)
var a = 10
a.adjust()
print(a)
print(a.simpleDescription)
```

## Error Handling

### 定义

- 错误是枚举类型
- 需要实现`Error`接口

```swift
enum PrinterError: Error {
    case outOfPaper
    case noToner
    case onFire
}
```

### 抛出异常

- 在可能抛出一样的函数声明时需要在参数列表后面加`throws`标记,标识函数可能抛出异常
- 使用`throw`和对应的异常枚举来抛出异常
- 函数在抛出异常后会立刻返回,终止执行,不会有返回值

```swift
func send(job: Int, toPrinter printerName: String) throws -> String {
    if printerName == "Never Has Toner" {
        throw PrinterError.noToner
    }
    return "Job sent"
}
```

### 捕获异常

- 使用`do...catch`来捕获异常
- `catch`中的异常默认名为`error`,可以手动设置来修改该名称
- 调用可能会抛出异常的函数时需要在函数名前使用`try`
- 假如没有发生异常,则`catch`代码段不会执行

```swift
do {
    let printerResponse = try send(job: 1040, toPrinter: "Bi Sheng")
    print(printerResponse)
} catch {
    print(error)
}
```

- 可以使用多个`catch`,分别捕获不同的异常

```swift
do {
    let printerResponse = try send(job: 1440, toPrinter: "Gutenberg")
    print(printerResponse)
} catch PrinterError.onFire {
    print("I'll just put this over here, with the rest of the fire.")
} catch let printerError as PrinterError {
    print("Printer error: \(printerError).")
} catch {
    print(error)
}
```

- 可以使用`try?`来忽略异常,发生异常后,返回nil,无异常则正常返回

```swift
let printerSuccess = try? send(job: 1884, toPrinter: "Mergenthaler")
let printerFailure = try? send(job: 1885, toPrinter: "Never Has Toner")
```

### 例子

```swift
enum PrinterError: Error {
    case outOfPaper
    case noToner
    case onFire
}

func send(job: Int, toPrinter printerName: String) throws -> String {
    if printerName == "Never Has Toner" {
        throw PrinterError.noToner
    }
    return "Job sent"
}

var printerResponse = "123"
do {
    printerResponse = try send(job: 1040, toPrinter: "Never Has Toner")
    print(printerResponse)
} catch {
    print(printerResponse, error) // 123	noToner
}
```

### defer

- 在代码块内所有代码执行后,最后执行的代码
- 不会因为有异常而不执行

```swift
var fridgeIsOpen = false
let fridgeContent = ["milk", "eggs", "leftovers"]

func fridgeContains(_ food: String) -> Bool {
    fridgeIsOpen = true
    defer {
        fridgeIsOpen = false
    }

    let result = fridgeContent.contains(food)
    print(fridgeIsOpen)
    return result
}
fridgeContains("banana")
print(fridgeIsOpen)
```

## Generics

- 就是像c++模版一样的功能

```swift
func makeArray<Item>(repeating item: Item, numberOfTimes: Int) -> [Item] {
    var result = [Item]()
    for _ in 0..<numberOfTimes {
        result.append(item)
    }
    return result
}
makeArray(repeating: "knock", numberOfTimes: 4)
```

- 类/枚举也可以使用模版

```swift
// Reimplement the Swift standard library's optional type
enum OptionalValue<Wrapped> {
    case none
    case some(Wrapped)
}
var possibleInteger: OptionalValue<Int> = .none
possibleInteger = .some(100)
```

- `where`可以限定模版参数的类型
- Writing`<T: Equatable>`is the same as writing`<T> ... where T: Equatable`.

```swift
func anyCommonElements<T: Sequence, U: Sequence>(_ lhs: T, _ rhs: U) -> Bool
    where T.Iterator.Element: Equatable, T.Iterator.Element == U.Iterator.Element {
        for lhsItem in lhs {
            for rhsItem in rhs {
                if lhsItem == rhsItem {
                    return true
                }
            }
        }
        return false
}
anyCommonElements([1, 2, 3], [3])
```
```swift
func anyCommonElements<T: Sequence>(_ lhs: T, _ rhs: T) -> Bool
    where T.Iterator.Element: Equatable {
        for lhsItem in lhs {
            for rhsItem in rhs {
                if lhsItem == rhsItem {
                    return true
                }
            }
        }
        return false
}
print("abc", anyCommonElements([1, 2, 3], [3]))
```

