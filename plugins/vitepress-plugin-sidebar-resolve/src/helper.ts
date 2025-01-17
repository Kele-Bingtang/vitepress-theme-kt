import { readdirSync, statSync, existsSync, readFileSync } from "node:fs";
import { join, basename, resolve } from "node:path";
import chalk from "chalk";
import matter from "gray-matter";
import { DefaultTheme } from "vitepress";
import { SidebarOption } from "./types";

export const log = (message: string, type = "yellow") => {
  console.log(chalk[type](message));
};

// 默认忽略的文件夹列表
export const DEFAULT_IGNORE_DIR = [
  "scripts",
  "components",
  "assets",
  ".vitepress",
  "@pages",
  "node_modules",
  ".vitepress",
  "_posts",
  "package.json",
];

/**
 * 生成侧边栏数据
 * @param  sourceDir .md 文件所在源目录，一般是 docs 目录（绝对路径）
 * @param  collapsed  是否可折叠
 */
export default (option: SidebarOption = {}): DefaultTheme.SidebarMulti => {
  const { path = "/docs", ignoreList = [], scannerRootMd = true, sideBarResolved } = option;

  const sourceDir = join(process.cwd(), path);

  let sidebar: DefaultTheme.SidebarMulti = {};
  // 获取指定根目录下的所有目录绝对路径
  const dirPaths = readDirPaths(sourceDir, ignoreList);

  // 只扫描根目录的 md 文件
  if (scannerRootMd) sidebar[`/`] = createSideBarItems(sourceDir, option, "", scannerRootMd);

  // 遍历根目录下的每个子目录，生成对应的侧边栏数据
  dirPaths.forEach(dirPath => {
    // dirPath 是每个目录的绝对路径
    const fileName = basename(dirPath);

    // 创建 SideBarItems
    const sidebarItems = createSideBarItems(dirPath, option, fileName);

    if (!sidebarItems.length) {
      return log(`warning：该目录「${dirPath}」内部没有任何文件或文件序号出错，将忽略生成对应侧边栏`);
    }

    sidebar[`/${fileName}/`] = sidebarItems;
  });

  return sideBarResolved?.(sidebar) ?? sidebar;
};

/**
 * 指定根目录下的所有目录绝对路径，win 如 ['D:\docs\01.guide', 'D:\docs\02.design']，linux 如 ['/usr/local/docs/01.guide', '/usr/local/docs/02.design']
 * @param sourceDir 指定文件/文件夹的根目录
 */
const readDirPaths = (sourceDir: string, ignoreList: SidebarOption["ignoreList"] = []) => {
  const dirPaths: string[] = [];
  // 读取目录，返回数组，成员是 root 下所有的目录名（包含文件夹和文件，不递归）
  const secondDirNames = readdirSync(sourceDir);

  secondDirNames.forEach(secondDirName => {
    // 将路径或路径片段的序列解析为绝对路径，等于使用 cd 命令
    const secondDirPath = resolve(sourceDir, secondDirName);
    // 是否为文件夹目录，并排除指定文件夹
    if (![...DEFAULT_IGNORE_DIR, ...ignoreList].includes(secondDirName) && statSync(secondDirPath).isDirectory()) {
      dirPaths.push(secondDirPath);
    }
  });

  return dirPaths;
};

/**
 * 将目录映射为对应的侧边栏配置数据，处理成 VitePress 格式
 *
 * @param root 文件/文件夹的根目录绝对路径
 * @param option 配置项
 * @param prefix 记录的文件/文件夹路径（包含刚进入方法时的 root 目录）
 * @param recursive 是否迭代
 */
const createSideBarItems = (
  root: string,
  option: SidebarOption,
  prefix = "",
  onlyScannerRootMd = false
): DefaultTheme.SidebarItem[] => {
  const {
    collapsed = true,
    ignoreList = [],
    ignoreIndexMd,
    fileIndexPrefix = false,
    sideBarItemsResolved,
    beforeCreateSideBarItems,
  } = option;

  if (ignoreIndexMd && (root.includes("index.md") || root.includes("index.MD"))) return [];

  // 读取目录名（文件和文件夹）
  let secondDirNames = readdirSync(root);

  // 结构化文章侧边栏数据，以文件夹的序号为数字下标
  let sidebarItems: DefaultTheme.SidebarItem[] = [];
  // 存储没有序号的文件，最终生成 sidebarItems 的时候，将这些文件放到最后面
  let sidebarItemsNoIndex: DefaultTheme.SidebarItem[] = [];

  secondDirNames = beforeCreateSideBarItems?.(secondDirNames) ?? secondDirNames;

  secondDirNames.forEach(filename => {
    const filePath = resolve(root, filename);
    // 解析文件名
    let { index: indexStr, text, type, name } = resolveFileName(filename, filePath);

    // 十进制转换
    const index = parseInt(indexStr as string, 10);

    // 校验文件序号
    if (fileIndexPrefix && isIllegalIndex(index)) {
      log(`warning：该文件「${filePath}」序号出错，请填写正确的序号`);
      return [];
    }

    // 判断序号是否已经存在
    if (sidebarItems[index]) log(`warning：该文件「${filePath}」的序号在同一级别中重复出现，将会被覆盖`);

    if (!onlyScannerRootMd && statSync(filePath).isDirectory()) {
      // 是文件夹目录
      if ([...DEFAULT_IGNORE_DIR, ...ignoreList].includes(filename)) return [];

      // 按顺序从该目录下的 [index.md, index.MD, 目录名.md] 文件获取标题，一旦获取到第一个则不再继续遍历
      const filenames = [
        join(root, filename, "index.md"),
        join(root, filename, "index.MD"),
        join(root, filename, filename + ".md"),
      ];

      for (const filename of filenames) {
        const title = getTitleFromMd(filename);
        if (title) {
          text = title;
          break;
        }
      }

      const sidebarItem = {
        text,
        collapsed,
        items: createSideBarItems(filePath, option, `${prefix}/${filename}`),
      };

      if (isIllegalIndex(index)) sidebarItemsNoIndex.push(sidebarItem);
      else sidebarItems[index] = sidebarItem;
    } else {
      // 是文件
      // 开启扫描根目录 md 文件时，不扫描 index.md
      if (onlyScannerRootMd && filename.includes("index.md")) return [];

      if (
        !isMdFileExtension(type) ||
        (ignoreIndexMd && filename.includes("index.md")) ||
        [...DEFAULT_IGNORE_DIR, ...ignoreList].some(
          item => filename.includes(item as string) || (item instanceof RegExp && item.test(filename))
        )
      ) {
        // 开启扫描根目录时，则不添加提示功能，因为根目录有大量的文件/文件夹不是 md 文件，这里不应该打印
        !onlyScannerRootMd && log(`warning：该文件「${filePath}」非 .md 格式文件，不支持该文件类型`);
        return [];
      }

      const content = readFileSync(filePath, "utf8");
      // 解析出 front matter 数据
      const { data: { permalink = "", title } = {} } = matter(content, {});

      // title 获取顺序：md 文件 formatter 的 title > md 文件的第一个 # 后面的内容 > md 文件名
      if (title) text = title;
      else text = getTitleFromMd(filePath) || text;

      // 当没有文件序号时，index == text
      const sidebarItem = {
        text,
        collapsed,
        link: `/${prefix}/${name}`,
      };

      if (isIllegalIndex(index)) sidebarItemsNoIndex.push(sidebarItem);
      else sidebarItems[index] = sidebarItem;
    }
  });

  // 将没有序号的 sidebarItemsNoIndex 放到最后面
  sidebarItems = [...sidebarItems, ...sidebarItemsNoIndex].filter(Boolean);

  return sideBarItemsResolved?.(sidebarItems) ?? sidebarItems;
};

/**
 * 尝试从一个 md 文件中读取标题
 * @param filePath 文件绝对路径
 * @param deep true 是否寻找标题直到没有为止，false 只读取第一个 # 后的内容作为标题
 */
const getTitleFromMd = (filePath: string, deep = false): string | undefined => {
  if (!existsSync(filePath)) return undefined;

  if (!isMdFile(filePath)) return undefined;

  const content = readFileSync(filePath, { encoding: "utf-8" });

  if (deep) return content.match(/^(#+)\s+(.+)/m)?.[2] || "";

  // 切割换行符 \r\n 或 \n
  const lines = content.split(/\r?\n/);

  for (const line of lines) if (line.startsWith("# ")) return line.substring(2);

  return undefined;
};

/**
 * 解析文件名，返回文件序号、文件标题、文件类型
 * @param filename 文件名
 * @param filePath 文件绝对路径
 */
const resolveFileName = (
  filename: string,
  filePath: string
): { index: string | number; text: string; type: string; name: string } => {
  const stat = statSync(filePath);
  // 文件序号
  let index: string | number = "";
  // 文章标题，如果为目录，则默认为文件夹名。如果为 md 文件，则尝试获取 front matter 中的 title，否则为文件名为标题
  let text = "";
  // 文件类型
  let type = "";
  // 文件名称，不带后缀
  let name = "";

  /**
   * 如果 filename 为 1.Ke.md，则解析为 ['1', 'Ke', 'md']，其中 index 为 1，title 为 Ke，type 为 md
   * 如果 filename 为 1.Ke.d.md，则解析为 ['1', 'Ke.d', 'md']，其中 index 为 1，title 为 Ke.d，type 为 md
   */
  const fileNameArr = filename.split(".");

  if (fileNameArr.length === 2) {
    index = fileNameArr[0];
    text = stat.isDirectory() ? fileNameArr[1] : fileNameArr[0];
    type = fileNameArr[1];
    name = fileNameArr[0];
  } else {
    const firstDotIndex = filename.indexOf(".");
    const lastDotIndex = filename.lastIndexOf(".");
    index = filename.substring(0, firstDotIndex);
    type = filename.substring(lastDotIndex + 1);
    name = filename.substring(0, lastDotIndex);

    if (stat.isDirectory()) text = filename.substring(firstDotIndex + 1);
    else text = filename.substring(firstDotIndex + 1, lastDotIndex);
  }

  return { index, text, type, name };
};

/**
 * 判断是否为 md 文件
 *
 * @param filePath 文件绝对路径
 */
const isMdFile = (filePath: string) => {
  const fileExtension = filePath.substring(filePath.lastIndexOf(".") + 1);
  return isMdFileExtension(fileExtension);
};

/**
 * 判断是否已 md/MD 结尾
 *
 * @param fileExtension 文件后缀名
 */
const isMdFileExtension = (fileExtension: string) => {
  return ["md", "MD"].includes(fileExtension);
};

/**
 * 判断是否非法的序号
 *
 * @param index 序号
 */
const isIllegalIndex = (index: number) => {
  return isNaN(index) || index < 0;
};
