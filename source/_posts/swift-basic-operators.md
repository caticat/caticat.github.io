---
title: Swift基本操作符
tags: swift
categories: swift
date: 2018-09-20 16:48:15
---

**本文是根据官方文档整理出来的阅读笔记,[原文地址](https://docs.swift.org/swift-book/LanguageGuide/BasicOperators.html)**

- 就是`+`,`-`,`*`,`&&`等一些常用的操作符
- 包含了大部分的`C`语言操作符
- 扩展优化了个别操作符
	- `=`不会返回数值,防止在bool判断中出现问题
	- 加减乘除取余运算符直接校验数值防止溢出(可以通过swift的溢出操作符来实现该需求)
- 新增了一些操作符
	- `..<`,表示一个范围,从起始开始,<最终值
	- `...`,表示一个范围,从起始开始,<=最终值

## 学术用语

- 一元运算符(`unary`)
	- 类似`-a`这种,只作用于一个参数的
	- `!a`和`a!`分别是前缀和后缀的用法,意义不一样
- 二元运算符(`binary`)
	- `2+3`
- 三元运算符(`ternary`)
	- 只有三目表达式是三元运算符
	- `a ? b : c`

<!-- more -->
## 赋值运算符

- 基本用法
```swift
let b = 10
var a = 5
a = b
// a is now equal to 10
```
- 同时给多个参数赋值
```swift
let (x, y) = (1, 2)
// x is equal to 1, and y is equal to 2
```
- `=`无返回值,所以以下代码无效,编译报错
```swift
if x = y {
    // This is not valid, because x = y does not return a value.
}
```

## 算数运算符

- 基本
```swift
1 + 2       // equals 3
5 - 3       // equals 2
2 * 3       // equals 6
10.0 / 2.5  // equals 4.0
```
- 溢出操作符
	- 就是在普通的操作符前加上`&`
```swift
a &+ b
```
- 支持字符串连接
```swift
"hello, " + "world"  // equals "hello, world"
```

### 取余操作符

- `%`
```swift
9 % 4    // equals 1
```
- 被除数是负数的情况下
```swift
-9 % 4   // equals -1
```
- 操作符后面的数字的正负是忽略的,只和前面的数字的正负值有关
所以所有的余数的结果的正负都和前面的数字一致

### 一元`-`操作符

- 基础
```swift
let three = 3
let minusThree = -three       // minusThree equals -3
let plusThree = -minusThree   // plusThree equals 3, or "minus minus three"
```

### 一元`+`操作符

- 基础
```swift
let minusSix = -6
let alsoMinusSix = +minusSix  // alsoMinusSix equals -6
```
- 无实际意义,可以对齐代码用

## 混合赋值操作符

- 基础
	- `+=`,`-=`等类似的操作符
```swift
var a = 1
a += 2
// a is now equal to 3
```
- 该操作符无返回,不能用于后续赋值,如:`let b = a += 2`

## 比较运算符

- 和标准C的比较操作符一样
	- `a == b`
	- `a != b`
	- `a > b`
	- `a < b`
	- `a >= b`
	- `a <= b`
- 扩展
	- 用于判断两个对象是否引用同一个对象
	- `a === b`
	- `a !== b`
- 比较运算符返回bool值
```swift
1 == 1   // true because 1 is equal to 1
2 != 1   // true because 2 is not equal to 1
2 > 1    // true because 2 is greater than 1
1 < 2    // true because 1 is less than 2
1 >= 1   // true because 1 is greater than or equal to 1
2 <= 1   // false because 2 is not less than or equal to 1
```
- 比较运算符常用语`if`中
```swift
let name = "world"
if name == "world" {
    print("hello, world")
} else {
    print("I'm sorry \(name), but I don't recognize you")
}
// Prints "hello, world", because name is indeed equal to "world".
```
- 可以直接比较tuple的值
	- swift标准库提供的比较支持元组长度<7(当被比较的元组长度>=7时,需要自己实现比较操作符)
	- 被比较的元组必须元素个数相同
	- 不同元组相同索引的元素类型要相同
		- 整数可以直接与浮点数做比较
	- 所有元组元素必须都可以被比较运算符操作才可以
```swift
("blue", -1) < ("purple", 1)        // OK, evaluates to true
("blue", false) < ("purple", true)  // Error because < can't compare Boolean values
```
	- 比较方法
		- 按照元组索引依次比较
		- 相同则向后比较
		- 不同则不继续向后比较,直接返回当前的比较结果
```swift
(1, "zebra") < (2, "apple")   // true because 1 is less than 2; "zebra" and "apple" are not compared
(3, "apple") < (3, "bird")    // true because 3 is equal to 3, and "apple" is less than "bird"
(4, "dog") == (4, "dog")      // true because 4 is equal to 4, and "dog" is equal to "dog"
```

## 三目表达式

- 就是标准的三目表达式
```swift
let contentHeight = 40
let hasHeader = true
let rowHeight = contentHeight + (hasHeader ? 50 : 20)
// rowHeight is equal to 90
```
```swift
let contentHeight = 40
let hasHeader = true
let rowHeight: Int
if hasHeader {
    rowHeight = contentHeight + 50
} else {
    rowHeight = contentHeight + 20
}
// rowHeight is equal to 90
```
- 尽量不要组合使用三目表达式,防止代码难以阅读理解

## Nil-Coalescing Operator

- 就是操作符`a ?? b`
	- 其中,a是可选参数
	- 如果a是nil,则返回b
	- 否则返回a的解包值
	- b和a的解包值的类型必须一致
	- 意思同`a != nil ? a! : b`一样
	- 如果a不是nil,则b的值不会计算(代码不会运行,就像or前面的条件是真一样)
```swift
let defaultColorName = "red"
var userDefinedColorName: String?   // defaults to nil

var colorNameToUse = userDefinedColorName ?? defaultColorName
// userDefinedColorName is nil, so colorNameToUse is set to the default of "red"
```
	- `??`只能用在可选参数的后面

## 范围操作符

- `..<`,不包含最后的值
- `...`,包含最后的值
```swift
for i in 1..<5 { // 1, 2, 3, 4
        print(i)
}
for i in 1...5 { // 1, 2, 3, 4, 5
        print(i)
}
```

### 单边范围

- 在遍历的时候可以使用单边范围,没有指定的一边为容器的上/下界限
```swift
let names = ["Anna", "Alex", "Brian", "Jack"]
for name in names[2...] {
    print(name)
}
// Brian
// Jack

for name in names[...2] {
    print(name)
}
// Anna
// Alex
// Brian

for name in names[..<2] {
    print(name)
}
// Anna
// Alex
```
- 单边范围还可以表示无限的内容
```swift
let range = ...5 // 表示从负无穷到5(包含5)
print(range.contains(7))
print(range.contains(4))
print(range.contains(-1))
print(range.contains(0))
```

## 逻辑运算符

- `&&`,与
- `||`,或
- `!`,非
- 行为同C语言一直
```swift
let enteredDoorCode = true
let passedRetinaScan = false
if enteredDoorCode && passedRetinaScan {
    print("Welcome!")
} else {
    print("ACCESS DENIED")
}
// Prints "ACCESS DENIED"
```
```swift
let hasDoorKey = false
let knowsOverridePassword = true
if hasDoorKey || knowsOverridePassword {
    print("Welcome!")
} else {
    print("ACCESS DENIED")
}
// Prints "Welcome!"
```
- 范例中的一个写法(个人不喜欢)
```swift
if enteredDoorCode && passedRetinaScan || hasDoorKey || knowsOverridePassword {
    print("Welcome!")
} else {
    print("ACCESS DENIED")
}
// Prints "Welcome!"
```
- swift中逻辑运算符是优先按照最左边的内容开始运算的
- 这里可以看出and和or是平级的,但是不知道not的优先级
- 个人感想:记优先级极为蛋疼,正常人都用括号保证安全
- 正常人的写法
```swift
if (enteredDoorCode && passedRetinaScan) || hasDoorKey || knowsOverridePassword {
    print("Welcome!")
} else {
    print("ACCESS DENIED")
}
// Prints "Welcome!"
```
