---
<%*
const titleName = await tp.user.ExtractProjectTitle(tp);
const projectName = await tp.user.IOTOCreateProjectName(tp.file.folder(true), projectNameFormat);
// 过滤掉空字符串和undefined等假值
const arr = [projectName, titleName].filter(Boolean);
%>
Project: [<% arr.map(x => `"${x}"`).join(", ") %>]
---