---
title: leveldb源码阅读-c11相关知识整理
tags:
  - leveldb
  - source
  - database
  - c11
categories: leveldb
date: 2019-02-12 17:19:38
---

因为leveldb源码中大量的运用了c11的知识点,不懂的话是要仔细看看的
这里做了一下总结的功能和记录
会根据我看到的内容慢慢扩展

## noexcept

标记在函数的`()`后面,表示希望函数无异常抛出,如果函数抛出任何异常,则会报错crash
- 这里说的是修饰符版本,不是操作符版本
- 操作符版本会根据函数是否有`noexcept`修饰过来返回bool类型值表示是否期望无异常抛出

## 临时变量的简单说明

简单的说,我们能够看到的命名变量都不是临时变量

## &&参数的右值引用

在拷贝构造函数与赋值函数中会大量使用右值引用的优化
使用右值引用可以有效减少构造函数的调用
右值引用的本质是将临时参数对象的值交换给实际上有效的对象
而不是复制一份新的给对象
系统会自动判断,如果参数是临时变量,
则会优先调用右值引用优化处理的函数,
如果找不到,则会自动调用普通的函数处理.
非临时变量全部是调用普通的函数处理.

普通的声明
```cpp
Status(const Status& rhs);
Status& operator=(const Status& rhs);
```

使用右值引用的声明
```cpp
Status(Status&& rhs) noexcept : state_(rhs.state_) { rhs.state = nullptr; }
Status& operator=(Status&& rhs) noexcept;
inline Status& Status::operator=(Status&& rhs) noexcept {
  std::swap(state_, rhs.state_); // 注意:这里是交换,没有复制
  return *this;
}
```

注意:
- 右值引用优化需要和普通的老版本标准函数结合使用,最好不要单独使用,否则会出现无法复制非临时变量的对象
- 右值引用的函数参数不是`const`,这里要注意,因为交换时实际是修改了参数的内容的

<!-- more -->

## std::move

有些声明了对象名,
但实际是临时对象的参数,
想要使用右值引用做优化时,
可以使用这个函数将对象强制转化为右值参数,
从而调用右值引用的优化函数.

**注:不要使用已经被右值优化函数处理过的原始对象,因为他的内容很可能已经不对了**

## = default

用于修饰一些可以提供默认函数体的函数(构造函数,复制构造函数,赋值函数等)
显示的表明使用默认提供的函数

## = delete

类似`= default`,是禁用函数的意思.
区别是可以对非默认函数使用

```cpp
#include <iostream>
using namespace std;

class Test {
public:
    void test(int a) {}
    void test(float a) = delete;
};

int main(int argc, char *argv[]) {
    Test data1;
    data1.test(1); // OK
    data1.test(0.5); // error: call to member function 'test' is ambiguous
    return 0;
}
```
