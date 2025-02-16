import { TkThemeConfig } from "./types";
import Sidebar from "vitepress-plugin-sidebar-resolve";
import Permalink from "vitepress-plugin-permalink";
import MdH1 from "vitepress-plugin-md-h1";
import Catalogue from "vitepress-plugin-catalogue";
import DocAnalysis from "vitepress-plugin-doc-analysis";
import FileContentLoader, { FileContentLoaderOptions } from "vitepress-plugin-file-content-loader";
import { UserConfig } from "vitepress";
import { PluginOption } from "vite";
import { transformData, transformRaw } from "../post";
import { Post, TkContentData } from "../post/types";

export default function themeConfig(config: TkThemeConfig = {}): UserConfig {
  const { plugins: pluginsOption, ...c } = config;
  const {
    sidebar = true,
    sidebarOption = {},
    permalink = true,
    permalinkOption,
    mdH1 = true,
    catalogueOption,
    docAnalysis = true,
    docAnalysisOption = {},
    fileContentLoaderIgnore = [],
  } = pluginsOption || {};

  const fileContentLoaderOptions: FileContentLoaderOptions<TkContentData, Post> = {
    pattern: ["**/*.md"],
    // 指定摘录格式
    excerpt: "<!-- more -->",
    includeSrc: true,
    transformData,
    transformRaw,
    themeConfigKey: "posts",
    globOptions: {
      ignore: [
        "**/scripts/**",
        "**/components/**",
        "**/assets/**",
        "**/.vitepress/**",
        "**/public/**",
        ...fileContentLoaderIgnore,
      ],
    },
  };

  const plugins: PluginOption[] = [];

  if (config.tkTheme !== false) {
    plugins.push(Catalogue(catalogueOption));
    plugins.push(FileContentLoader<TkContentData, Post>(fileContentLoaderOptions));
  }

  if (sidebar) {
    sidebarOption.ignoreList = [...(sidebarOption?.ignoreList || []), "@pages", "@fragment"];
    plugins.push(Sidebar(sidebarOption));
  }
  if (permalink) plugins.push(Permalink(permalinkOption));
  if (mdH1) plugins.push(MdH1());
  if (docAnalysis) {
    docAnalysisOption.ignoreList = [...(sidebarOption?.ignoreList || []), "@pages", /目录页/];
    plugins.push(DocAnalysis(docAnalysisOption));
  }

  return {
    vite: {
      plugins,
      // 解决终端打印 Scss 的废弃警告：The legacy JS API is deprecated and will be removed in Dart Sass 2.0.0.
      css: { preprocessorOptions: { scss: { api: "modern" } } },
    },
    themeConfig: { ...c },
  };
}
