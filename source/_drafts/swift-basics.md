---
title: Swift基础
tags: swift
categories: swift
---

## 变量/常量

- 常量
	- `let`
- 变量
	- `var`

**注:可在一行内生命多个变量/常量**
`var a = 1, b = 2, c = 3`

## 类型限定

- 可在变量/常量后追加类型限定
	- `var a : 类型`
- 默认可以根据初次赋值内容推断类型
- **没有在声明时直接赋值的变量/常量必须要限定类型**
- 相同类型的可以定义在同一行(变量/常量)
	`var a, b, c : Int`中,`a`,`b`,`c`都是`Int`类型

## 变量/常量民命规则

- 不能有空格,运算符,箭头
- 不能以数字开头
- 几乎可以使用任何字符
```swift
let π = 3.14159
let 你好 = "你好世界"
let 🐶🐮 = "dogcow"
```
- 一旦定义好一个名称为变量或常量,则不能更改变量/常量类型,不能更改存储数据的类型
(可以但不推荐使用关键字命名,使用关键字命名需要使用`\``来将名称括起来)

<!-- more -->
## 打印变量/常量

- 使用`print(\_:separator:terminator:)`函数
- 打印不换行
```swift
print("abc", terminator:"")
print("def")
```
- 在字符串中,使用`\\(变量/常量名)`来插入字符串
```swift
var a = "def"
var b = "abc\(a)ghi"
```

## 注释

- 基本和c语言一样
- 单行注释
	- `//`
- 多行注释
	- `/*...*/`
	- 多行注释可以嵌套(和c不同的地方),方便快速注释大段内容
```swift
/* This is the start of the first multiline comment.
 /* This is the second, nested multiline comment. */
This is the end of the first multiline comment. */
```

## 分号

- 在一行结尾的分号,可写,可不写
- 一行内有多条语句,则需要在每条语句中间插入分号
```swift
let cat = "🐱"; print(cat)
// Prints "🐱"
```

## 整数

- 推荐使用Int,只有在没有办法真正需要的时候才使用其他类型
	- 可移植性
	- 类型转换

### 边界

- 可以使用`类型.min`/`类型.max`来访问类型边界的最大,最小值
```swift
let minValue = UInt8.min  // minValue is equal to 0, and is of type UInt8
let maxValue = UInt8.max  // maxValue is equal to 255, and is of type UInt8
```

### Int

- 大多数情况下不需要手动指定所使用的整数的长度
- swift会根据平台来决定Int对应的类型
	- 32-bit平台,Int就是Int32
	- 64-bit平台,Int就是Int64

### UInt

- 和Int一样,只是将负数字段移动到整数字段了
- swift会根据平台来决定UInt对应的类型
	- 32-bit平台,Int就是UInt32
	- 64-bit平台,Int就是UInt64

## 浮点数

- Double,表示64-bit浮点数,精度15
- Float,表示32-bit浮点数,精度6
- 都是有符号的
- **自动推断类型默认为Double**

## 类型安全与推断

- swift是类型安全的,类型必须显示转换,被定义后的类型不能改变
- 推断类型
	- Int
	- Double
	- Int + Double = Double

## 进制

- 十进制:无前缀
- 二进制:`0b`前缀
- 八进制:`0o`前缀
- 十六进制:`0x`前缀
```swift
let decimalInteger = 17
let binaryInteger = 0b10001       // 17 in binary notation
let octalInteger = 0o21           // 17 in octal notation
let hexadecimalInteger = 0x11     // 17 in hexadecimal notation
```
- 十进制小数
	- 1.25e2 means 1.25 x 102, or 125.0.
	- 1.25e-2 means 1.25 x 10-2, or 0.0125.
- 十六进制小数
	- 0xFp2 means 15 x 22, or 60.0.
	- 0xFp-2 means 15 x 2-2, or 3.75.
```swift
// 12.1875
let decimalDouble = 12.1875
let exponentDouble = 1.21875e1
let hexadecimalDouble = 0xC.3p0
```
- 数字都可以在前面加0或者在中间增加`\_`来增加可读性
```swift
let paddedDouble = 000123.456
let oneMillion = 1_000_000
let justOverOneMillion = 1_000_000.000_000_1
```

## 数字类型转换

- 不同类型的数字不能直接运算
- 需要转化为相同类型才能运算
- 运算结果为最终统一的类型
```swift
let twoThousand: UInt16 = 2_000
let one: UInt8 = 1
let twoThousandAndOne = twoThousand + UInt16(one)
```
- 浮点数转为整数是直接去掉小数点后的内容(4.75->4,-3.9->3)
```swift
let three = 3
let pointOneFourOneFiveNine = 0.14159
let pi = Double(three) + pointOneFourOneFiveNine
// pi equals 3.14159, and is inferred to be of type Double
let integerPi = Int(pi)
// integerPi equals 3, and is inferred to be of type Int
```
- 数字字面值的运算不需要转换`3+0.14159`的操作是可以的,因为字面值没有显示的类型,会被自动转为推断的合理类型

## 别名

- `typealias`,为已有类型定义别名
```swift
typealias AudioSample = UInt16
var maxAmplitudeFound = AudioSample.min
```

## 布尔值

- `Bool`
- `true`/`false`
```swift
let orangesAreOrange = true
let turnipsAreDelicious = false
if turnipsAreDelicious {
    print("Mmm, tasty turnips!")
} else {
    print("Eww, turnips are horrible.")
}
// Prints "Eww, turnips are horrible."
```
- 不支持非0隐式转bool判断
```swift
let i = 1
if i {
    // this example will not compile, and will report an error
}
let i = 1
if i == 1 {
    // this example will compile successfully
}
```

## 元组

- 就是一个任意类型的元素的组合
- 使用`()`包围
- 可以直接给返回值的元组命名并使用
```swift
let http404Error = (404, "Not Found")
// http404Error is of type (Int, String), and equals (404, "Not Found")
let (statusCode, statusMessage) = http404Error
print("The status code is \(statusCode)")
// Prints "The status code is 404"
print("The status message is \(statusMessage)")
// Prints "The status message is Not Found"
```
- 可以使用`\_`来忽略部分不需要关注的参数
```swift
let (justTheStatusCode, _) = http404Error
print("The status code is \(justTheStatusCode)")
// Prints "The status code is 404"
```
- 可以按照索引获取元组的元素,索引初始值为`0`
```swift
print("The status code is \(http404Error.0)")
// Prints "The status code is 404"
print("The status message is \(http404Error.1)")
// Prints "The status message is Not Found"
```
- 可以直接为元组的元素命名,并使用
```swift
let http200Status = (statusCode: 200, description: "OK")
print("The status code is \(http200Status.statusCode)")
// Prints "The status code is 200"
print("The status message is \(http200Status.description)")
// Prints "The status message is OK"
```

## 可选数据

- 可选数据类型不是原始数据类型
- 是在原始基本类型上的封装,类似指针
- 可选数据类型可以为原始类型的值或者为nil
- 所有的原始类型都不能为nil
```swift
var a:Int?
if a != nil {
        print(1)
} else {
        print(2)
}
a = 10
if a != nil {
        print(1)
} else {
        print(2)
}
a = nil
if a != nil {
        print(1)
} else {
        print(2)
}
// 2 1 2
```
- 当确定可选数据不是nil的时候,可以使用`!`获取参数内部包含值
```swift
if a != nil {
        print(a!)
} else {
        print(2)
}
```
- 在nil值上使用`!`获取数据会产生运行时错误,产生core文件
- 可选数据绑定
	- 可以直接在`if`,`while`中绑定可选参数,将其转为常规类型值
```swift
var a:Int? = nil
a = 199
if let b = a {
        print(b)
} else {
        print(2)
}
```
	- 可选绑定不是引用绑定,改变绑定后的值并不会影响可选数据
```swift
var a:Int? = nil
a = 199
if var b = a {
        print(b) // 199
        b = 998
        print(b) // 998
        print(a) // 199
} else {
        print(2)
}
```
- `if`中可以使用`,`作为条件分隔,表示并列的关系,只有当所有条件都满足时,才会执行
```swift
if let firstNumber = Int("4"), let secondNumber = Int("42"), firstNumber < secondNumber && secondNumber < 100 {
    print("\(firstNumber) < \(secondNumber) < 100")
}
// Prints "4 < 42 < 100"

if let firstNumber = Int("4") {
    if let secondNumber = Int("42") {
        if firstNumber < secondNumber && secondNumber < 100 {
            print("\(firstNumber) < \(secondNumber) < 100")
        }
    }
}
// Prints "4 < 42 < 100"
```
- `if`的条件语句中定义的变量只能在`if`中使用,即时是在`else`中也是用不了的
```swift
if let a = Int("10"), a < 10 {
        print(1, a) // 可以使用a
} else {
        print(2) // 不可以使用a
}
```
- Implicitly Unwrapped Optional Properties
	- 就是当一个可选类型的值必定存在时,可以将它设置为这个类型
	- 如果可选类型为nil,使用这个类型同样会报错
	- **现在完全不明白这个东西的意义**
```swift
let possibleString: String? = "An optional string."
let forcedString: String = possibleString! // requires an exclamation mark

let assumedString: String! = "An implicitly unwrapped optional string."
let implicitString: String = assumedString // no need for an exclamation mark
```
```swift
let possibleString: String? = nil
//let forcedString: String = possibleString! // requires an exclamation mark // 运行时错误

let assumedString: String! = possibleString
//let implicitString: String = assumedString // no need for an exclamation mark // 运行时错误
if let a = assumedString {
        print(1, a)
} else {
        print(2)
}
```
