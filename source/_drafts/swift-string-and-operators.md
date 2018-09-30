---
title: Swift字符串
tags: swift
categories: swift
---
**本文是根据官方文档整理出来的阅读笔记,[原文地址](https://docs.swift.org/swift-book/LanguageGuide/StringsAndCharacters.html)**

**从本文开始,将减少原文的内容记录,集中把基本的常用的内容体现出来**

## 概述

- 当成std::string即可
	- 可以使用`+`连接字符串
	- 是值类型,传参等会复制字符串,而不是原始字符串的引用
	- 使用unicode字符集

**下面的内容如果有基础知识,可以不用看了**

<!-- more -->

## 定义/声明

- 标准字符串
```swift
let someString = "Some string literal value"
```
- 跨行字符串,可包含特殊符号
```swift
let quotation = """
The White Rabbit put on his spectacles.  "Where shall I begin,
please your Majesty?" he asked.

"Begin at the beginning," the King said gravely, "and go on
till you come to the end; then stop."
"""
```
	- 下面两个字符串表示的内容相同
```swift
let singleLineString = "These are the same."
let multilineString = """
These are the same.
"""
```
	- 使用`\`可以在代码中换行,而实际字符串不会换行(只有`"""`可用)
```swift
let softWrappedQuotation = """
The White Rabbit put on his spectacles.  "Where shall I begin, \
please your Majesty?" he asked.

"Begin at the beginning," the King said gravely, "and go on \
till you come to the end; then stop."
"""
```
	- 可以在收尾加入空行来使多行字符串前后有空行
	- 可以统一多行字符前的空格,按照结尾标记`"""`前面的空格数量做参照,会忽略格式用的空格
{% asset_img multilineStringWhitespace_2x.png 多行字符串格式 %}

## 特殊字符

- 可以使用`\`来标识特殊字符
- `\0`,空
- `\\`,\
- `\t`,tab
- `\n`,换行
- `\r`,return
...
- `\{unicode}`,对应的unicode字符
```swift
let wiseWords = "\"Imagination is more important than knowledge\" - Einstein"
// "Imagination is more important than knowledge" - Einstein
let dollarSign = "\u{24}"        // $,  Unicode scalar U+0024
let blackHeart = "\u{2665}"      // ♥,  Unicode scalar U+2665
let sparklingHeart = "\u{1F496}" // 💖, Unicode scalar U+1F496
```
- 多行字符中使用`"""`可以值转移一个`"`即可
```swift
let threeDoubleQuotationMarks = """
Escaping the first quotation mark \"""
Escaping all three quotation marks \"\"\"
"""
```

## 初始化

```swift
var emptyString = ""               // empty string literal
var anotherEmptyString = String()  // initializer syntax
// these two strings are both empty, and are equivalent to each other
```

## 判断为空

```swift
if emptyString.isEmpty {
    print("Nothing to see here")
}
// Prints "Nothing to see here"
```

## 字符串连接

```swift
var variableString = "Horse"
variableString += " and carriage"
// variableString is now "Horse and carriage"

let constantString = "Highlander"
constantString += " and another Highlander"
// this reports a compile-time error - a constant string cannot be modified
```

## 遍历字符串

```swift
for character in "Dog!🐶" {
    print(character)
}
// D
// o
// g
// !
// 🐶
```

## 字符

- 定义
```swift
let exclamationMark: Character = "!"
```

### 字符数组

```swift
let catCharacters: [Character] = ["C", "a", "t", "!", "🐱"]
let catString = String(catCharacters)
print(catString)
// Prints "Cat!🐱"
```

### 字符串连接字符

- 字符串可以使用append函数连接字符
- 字符不能连接字符串(因为只能存储一个字符)
```swift
var a : Character = "a"
var b = "abc"
b.append(a)
var c = "cde"
b.append(c)
print(b)
```

## 字符串中插入其他变量

```swift
let multiplier = 3
let message = "\(multiplier) times 2.5 is \(Double(multiplier) * 2.5)"
// message is "3 times 2.5 is 7.5"
```

// TODO:PAN 看官方文档内容太多了,先看书中别人总结的东西学习,后面找时间把细节内容补充上
