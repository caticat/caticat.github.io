---
title: hexo usage
date: 2018-03-27 16:56:21
tags: 
  - hexo
  - web
categories: hexo
---

## 功能

用`makrdown`文件为源,生成`html`文件的框架

## 学习笔记

### 添加`tag`支持

1. `hexo new page "tags"`
2. 编辑页面:
```yml
---
title: Tagcloud
date: 2018-03-27 16:59:00
type: "tags"
# commentts: false # 如果有评论功能需要禁止评论
---
```
3. 主题的配置文件增加`tags`处理,在`menu`中添加:
```yml
menu:
  Home: /
  Archives: /archives
  tags: /tags
```
4. 重新清理编译生成即可

## 快速入门(使用`github`,`gitpage`搭建自动更新博客)

1. `github`上创建`gitpage`的仓库,格式:`用户名.github.io`
2. `github`上创建分支`source`
2. 将远程库更新到本地
	```bash
	git clone https://github.com/用户名.github.io 用户名.github.io # 复制
	git checkout source # 切换到分支
	```
2. 本机安装`hexo`相关软件(记得勾选环境变量)
	1. `git`,安装包安装
	2. `node-js`,安装包安装
3. 本地创建页面
	```bash
	# mkdir 用户名.github.io # 名字随意,为了方便,统一用库名
	# cd 用户名.github.io
	hexo init
	npm install
	```
	会产生初始文件
	- `_config.yml`,网站配置文件(改下名字啊什么的)
	- `package.json`,`npm`的环境配置文件(调用`npm install`时会调用这个文件来配置环境)
	- `scaffolds`模版
	- `source`源文件目录(就是`.md`文件的位置)
	- `themes`主题目录,下载后在`_config.yml`中修改为对应的文件夹名即可使用相关主题(更换主题后建议使用`hexo clean`清除旧数据)
4. 本地测试
	```bash
	hexo g # 生成`html`静态页面
	hexo s # 本地预览测试
	```
5. 编写`.travis.yml`文件(简单配置,分支`source`上传才处理,自动安装hexo,自动强制推送到`master`分支,`GH_TOKEN`是在travis上的项目中定义,使用的是github上专门创建的`personal access token`)
```yml
language: node_js
node_js: stable

install:
  - npm install hexo --save
  #- npm install -g hexo-cli

script:
  - hexo clean
  - hexo g

after_script:
  - cd ./public
  - git init
  - echo "# Pan's Blog" >> README.md
  - echo "![travis](https://travis-ci.org/caticat/caticat.github.io.svg?branch=source)" >> README.md
  - git config user.name "caticat"
  - git config user.email "catifish@163.com"
  - git add .
  - git commit -m "Update docs"
  - git push --force --quiet "https://${GH_TOKEN}@${GH_REF}" master:master

branches:
  only:
    - source

env:
  global:
    - GH_REF: github.com/caticat/caticat.github.io.git
```
6. 推送到`github`上:`git push`
7. 等`travis`运行结束,即可访问`https://用户名.github.io`来看网页了
8. 后续更新
	- `hexo new 文件名`生成`.md`文件
	- 编辑对应的`.md`文件
	- 上传到`github`:`git commit -am "xxx" && git push`
	- 等待`travis`完成操作
	- 刷新网页看效果
