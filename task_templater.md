---
<%*
const titleName = await tp.user.ExtractProjectTitle(tp);
const projectName = await tp.user.IOTOCreateProjectName(tp.file.folder(true), projectNameFormat);
const arr = [projectName, titleName].filter(Boolean);
%>
Project: [<% arr.map(x => `"${x}"`).join(", ") %>]
---