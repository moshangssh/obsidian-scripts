// ExtractProjectTitle.js
// 用于从文件名中提取项目标题，文件名格式：xxx-YYYY-MM-DD-项目标题
function ExtractProjectTitle(tp) {
    // 获取当前文件标题
    const fileName = tp.file.title;
    // 匹配格式：任意-4位年-2位月-项目标题
    const match = fileName.match(/^([^-]+)-(\d{4})-(\d{2})-(.+)$/);
    if (!match) return '未检测到符合格式的文件名（应为xxx-YYYY-MM-DD-项目标题）';
    // 返回项目标题部分
    return match[4];
}

module.exports = ExtractProjectTitle;
