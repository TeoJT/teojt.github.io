#!/bin/sh
postName=$1
createTime="20`date +"%y-%m-%d"`"
formattedName=`echo $postName | tr '[:upper:]' '[:lower:]' | sed -r 's/[ ]+/-/g'`
fileName="_posts/$createTime-$formattedName.md"
echo "---" >> $fileName
echo "layout: post" >> $fileName
echo "title: \"$postName\"" >> $fileName
echo "date: $createTime `date +"%T"` +0000" >> $fileName
echo "---" >> $fileName
echo "" >> $fileName