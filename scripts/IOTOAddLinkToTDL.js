async function IOTOAddLinkToTDL(tp, tR, settings) {

    if(!tR || tR === tp.file.selection()) return tR;
    
    let {taskFolder, targetHeading, headingLevel, tdlDateFormat, followUpAction} = settings; 
    const {useUserTemplate, taskSelectorShowOptionOrder, taskSelectorShowBasePath, taskSelectorExcludesPaths, taskSelectorFolderOptionTemplate, projectNameFormat} = tp.app.plugins.plugins["ioto-settings"].settings;

    const activeFile = tp.config.active_file;
    const activeNote = tp.user.IOTONoteMaker(tp, activeFile);
    const activeCache = tp.app.metadataCache.getFileCache(activeFile);
    const activeFileFM = activeCache?.frontmatter;
    const doNotAddToTDL = activeFileFM?.doNotAddToTDL;

    if(doNotAddToTDL) return tR;
    
    let project = activeFileFM?.Project;
    if(Array.isArray(project)) {
        project = project[0];
    }
    
    const activeFileName = activeFile.basename;

    const defaultTemplate = "TP-任务-创建任务列表";
    const userTemplate = `My-${defaultTemplate}`;
    const hasUserTemplate = tp.file.find_tfile(userTemplate);
    const tdlTemplate = (useUserTemplate && hasUserTemplate) ? userTemplate : defaultTemplate;
    
    const activeBasePath = activeFile.path.split("/").first();
    
    let projectPath = "";
    let currentTDL = "";
    let message = "";
    let tdlFile = null;
    let isEmptyTaskList = false;

    // 检查必要条件
    const missingProject = !project || !project.length;

    if(missingProject) {
        message = "您已经开启了将链接添加到当前TDL的功能，当前笔记没有指定的Project属性，请先选择你想指定的Project。";
        new tp.obsidian.Notice(message, 6000);
        projectPath = await tp.user.IOTOGetFolderOption(tp, {
            folderPath: taskFolder,
            excludesPaths: taskSelectorExcludesPaths ? taskSelectorExcludesPaths.trim().split("\n") : [],
            showBasePathInOption: taskSelectorShowBasePath,
            optionContentTemplate: "{{folder}}",
            showOptionOrder: taskSelectorShowOptionOrder
        });
        
        if(projectPath){
            project = await tp.user.IOTOCreateProjectName(projectPath, projectNameFormat);
            let tempFMDict = Object.assign(activeNote.fmDict, {Project: [project], cssclasses: ["iotoTDL"]});
            await activeNote.prepareNoteFm(tempFMDict);
            await activeNote.prepareNoteContent();
            await tp.app.vault.modify(activeNote.file, activeNote.fm + "\n" + activeNote.content);
            await new Promise(r => setTimeout(r, 100)); //wait for metadata to update, steal from obsidian excalidraw
        } else {
            return tR;
        }
        
    }

    currentTDL = project + "-" + tp.date.now(tdlDateFormat);

    tdlFile = tp.file.find_tfile(currentTDL);

    const missingTDLFile = !tdlFile;

    // 如果没有对应的TDL文件，则提供路径选择，让用户先创建对应的TDL
    if(missingTDLFile) {
        const tldTargetPath = projectPath || await tp.user.IOTOGetFolderOption(tp, {
            folderPath: taskFolder,
            excludesPaths: [`-${project}`],
            showBasePathInOption: taskSelectorShowBasePath,
            optionContentTemplate: taskSelectorFolderOptionTemplate,
            showOptionOrder: taskSelectorShowOptionOrder
        });
        if (tldTargetPath) {   
            tdlFile = await tp.file.create_new(
                tp.file.find_tfile(tdlTemplate),
                currentTDL,
                false,
                tp.app.vault.getAbstractFileByPath(tldTargetPath)
            );
            await new Promise(r => setTimeout(r, 100)); //wait for metadata to update, steal from obsidian excalidraw

        } else {
            return tR;
        }
    }

    const tdlContent = await tp.app.vault.read(tdlFile);
    
    const tdlLines = tdlContent.trim().split("\n");
    const tdlCache = tp.app.metadataCache.getFileCache(tdlFile);
    
    const headings = tdlCache.headings;
    const tdlFileLinks = tdlCache?.links;
    const tdlFileBlocks = tdlCache?.blocks;
    const tdlFilePureLinks = tdlFileLinks?.map(link => link.original);
    let tdlItemBlockID = `^tdl-${tp.date.now("YYYYMMDDHHmmss")}`;
    let embedItem = "";
    
    // 如果不是在当前TDL文件中添加任务
    if(activeFileName !== currentTDL) {
        
        const choice = followUpAction || await tp.system.suggester(["插入链接","嵌入TDL条目"],[1,2]);

        // 如果链接不存在,则添加新任务
        if(!tdlFilePureLinks?.includes(tR)){
            
            embedItem = `![[${currentTDL}#${tdlItemBlockID}]]`;
            const targetHeadingSection = headings.filter(hs => hs.heading === targetHeading).first();
            const targetHeadingStartLine = targetHeadingSection.position.start.line;
            const embedTDLItem = 2 === choice ? true : false;
            const targetHeadingSectionIndex = tdlCache.sections.findIndex(element => element?.position?.start?.line === targetHeadingStartLine);
            const targetListSectionEndLine = tdlCache.sections[targetHeadingSectionIndex + 1].position.end.line;
            
            // 构建任务项,根据设置决定是否添加块ID
            const taskItem = `- [ ] ${tR}${embedTDLItem ? ` ${tdlItemBlockID}` : ''}`;
            
            // 在目标位置插入任务项
            tdlLines.splice(targetListSectionEndLine + 1, 0, taskItem);

            // 判断最后是否为空任务列表
            isEmptyTaskList = tdlLines[tdlLines.length - 1].trim() === "- [ ]" ? true : false;
            
            // 更新文件内容
            await tp.app.vault.modify(tdlFile, tdlLines.join("\n").concat(isEmptyTaskList ? " " : ""));
            await new Promise(r => setTimeout(r, 100)); //wait for metadata to update, steal from obsidian excalidraw

        } else {
            // 获取目标链接在TDL文件中的起始行号
            const targetLinkStartLine = tdlFileLinks.find(link => link.original === tR)?.position.start.line;
            // 查找目标链接所在行对应的块ID,如果没有则返回空字符串
            const [targetLinkBlcokId = ""] = Object.entries(tdlFileBlocks || {})
                .find(([_, block]) => block.position.start.line === targetLinkStartLine) || [];
            
            // 如果目标链接没有块ID,则添加新的块ID
            if(!targetLinkBlcokId) {
                tdlLines[targetLinkStartLine] += tdlItemBlockID;
                // 判断最后是否为空任务列表
                isEmptyTaskList = tdlLines[tdlLines.length - 1].trim() === "- [ ]" ? true : false;
                await tp.app.vault.modify(tdlFile, tdlLines.join("\n").concat(isEmptyTaskList ? " " : ""));
                await new Promise(r => setTimeout(r, 100)); //wait for metadata to update, steal from obsidian excalidraw
            }

            // 构建嵌入链接,使用已有的块ID或新生成的块ID(去掉前面的^符号)
            embedItem = `![[${currentTDL}#^${targetLinkBlcokId || tdlItemBlockID.slice(1)}]]`;
        }

        return choice === 2 ? embedItem : tR;
        
    } else {
        return tR;
    }
}

module.exports = IOTOAddLinkToTDL;