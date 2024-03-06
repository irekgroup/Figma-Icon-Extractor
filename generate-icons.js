require('dotenv').config();
const superagent = require('superagent');
const path = require('path');
const fs = require('fs/promises');
const chalk = require('chalk');
require('dotenv').config({path: '.env.local'} );

const {FIGMA_TOKEN} = process.env;

const FIGMA_API_HOST = 'https://api.figma.com/v1';
const ICONS_FILE_KEY = '1TDMKALpzX0ByUE7Jo2Fw8';
const CONTAINER_NODE_TYPE = 'FRAME';
const ICON_NODE_TYPE = 'COMPONENT';

const Types = {
  Mono: 'mono',
  Multi: 'multi',
  Illustration: 'illustration',
  Stub: 'stub',
  Unknown: 'unknown',
};

const PREFIXES = {
  [Types.Mono]: 'mono-',
  [Types.Multi]: 'multi-',
  [Types.Illustration]: 'illustration-',
  [Types.Stub]: 'stub-',
};

const BASE_DIR = '/static';
const IMG_DIR = `${BASE_DIR}/`;
const DIRECTORIES_BY_TYPES = {
  [Types.Mono]: 'pos/',
  [Types.Multi]: 'neg/',
  [Types.Illustration]: 'illustration/',
};

const MONOCHROME_BASE_COLOR = '#2D2F43';

const getTypeByPrefix = (name) => {
  return Object.entries(PREFIXES).reduce((acc, [type, prefix]) => {
    if (name.startsWith(prefix)) {
      return type;
    }
    return acc;
  }, Types.Unknown);
};

const IGNORED_TYPES = [Types.Stub, Types.Unknown];

const agent = superagent.agent();

const transformFigmaNode = (
  {name, id},
  parentType = Types.Unknown,
) => {
  const iconExplicitType = getTypeByPrefix(name);
  return {
    name,
    id,
    type:
      iconExplicitType !== Types.Unknown
        ? iconExplicitType
        : parentType,
  };
};

const generateUnionString = (names) =>
  names.length ? ["'", names.join("' | '"), "'"].join('') : 'never';

const logger = {
  info: (text) =>
    console.log(
      `${chalk.black.bgWhite(' INFO: '.padEnd(10))} ${text}`,
    ),
  success: (text) =>
    console.log(
      `${chalk.black.bgGreen(' SUCCESS: '.padEnd(10))} ${text}`,
    ),
  error: (text) =>
    console.log(
      `${chalk.black.bgRed(' ERROR: '.padEnd(10))} ${text}`,
    ),
};

async function main() {
  if (!FIGMA_TOKEN) {
    logger.error(
      'No figma token found! Make sure FIGMA_TOKEN is in your .env file or is in your environment variables',
    );

    process.exit(1);
  }

  let figmaDocument;

  logger.info('Getting info about icons document frames...');
  try {
    figmaDocument = (
      await agent
        .get(`${FIGMA_API_HOST}/files/${ICONS_FILE_KEY}`)
        .set('X-FIGMA-TOKEN', FIGMA_TOKEN)
    ).body;
  } catch (error) {
    logger.error(
      'Could not fetch figma document tree. Figma API error message:',
    );
    console.log(error);
    process.exit(1);
  }

  logger.info('Traversing figma tree to get icon components...');
  const iconNodes = figmaDocument?.document?.children
    .map(({children}) => children)
    .reduce((acc, pageNodes) => [...acc, ...pageNodes], [])
    .reduce((acc, node) => {
      if (
        node.type === CONTAINER_NODE_TYPE &&
        node?.children?.length
      ) {
        const containerType = getTypeByPrefix(node.name);
        return [
          ...acc,
          ...node.children
            .map((childNode) =>
              childNode.type === ICON_NODE_TYPE
                ? transformFigmaNode(childNode, containerType)
                : null,
            )
            .filter(Boolean),
        ];
      } else if (node.type === ICON_NODE_TYPE) {
        return [...acc, transformFigmaNode(node)];
      }

      return acc;
    }, [])
    .filter(({type}) => !IGNORED_TYPES.includes(type));

    console.log(iconNodes)
  let downloadableIcons;

  logger.info('Getting links to exported SVGs...');
  try {
    const iconUrls = (
      await agent
        .get(`${FIGMA_API_HOST}/images/${ICONS_FILE_KEY}`)
        .query({
          ids: iconNodes.map(({id}) => id).join(','),
          format: 'svg',
        })
        .set('X-FIGMA-TOKEN', FIGMA_TOKEN)
    ).body.images;

    downloadableIcons = iconNodes.map((icon) => ({
      ...icon,
      url: iconUrls[icon.id],
    }));
  } catch (error) {
    logger.error(
      'Failed to fetch URLs to exported icon nodes. Figma API error message:',
    );
    console.log(error);
    process.exit(1);
  }

  logger.info('Recreating folder structure...');
  const folderPath = path.join(process.cwd(), IMG_DIR);
  await fs.rm(folderPath, {force: true, recursive: true});
  await fs.mkdir(folderPath, {recursive: true});

  await Promise.all(
    Object.values(DIRECTORIES_BY_TYPES).map(async (dirName) =>
      fs.mkdir(path.join(folderPath, dirName), {recursive: true}),
    ),
  );

  logger.info(`Downloading ${downloadableIcons.length} icons...`);

  const pLimit = (await import('p-limit')).default;

  const limit = pLimit(100);

  await Promise.all(
    downloadableIcons.map(({name, url, type}) =>
      limit(async (cb) => {
        try {
          // Загружаем иконки. Уже без заголовка с токеном фигмы,
          // поскольку url'ы ведут в s3
          const icon = (await agent.get(url).retry(3)).body;

          let transformedIcon;
          let extension = '.svg';

          // При необходимости мы можем видоизменить наши иконки перед сохранением.
          if (type === Types.Mono) {
            transformedIcon = icon
              .toString()
              .replaceAll(MONOCHROME_BASE_COLOR, 'currentColor');
            extension = '.jsx.svg';
          }

          await fs.writeFile(
            path.join(
              folderPath,
              DIRECTORIES_BY_TYPES[type],
              `${name}${extension}`,
            ),
            transformedIcon || icon,
          );
          cb?.();
        } catch (e) {
          logger.error(
            `Failed to fetch icon ${name} of type ${type}. Original error message/object:`,
          );
          console.log(e?.message || e);
          if (cb) {
            cb?.(e);
          } else {
            throw e;
          }
        }
      }),
    ),
    100,
  );

  logger.info('Exporting typings...');

  const names = downloadableIcons.reduce(
    (acc, {name, type}) => {
      return {...acc, [type]: [...acc[type], name]};
    },
    {
      [Types.Mono]: [],
      [Types.Multi]: [],
      [Types.Illustration]: [],
    },
  );

  const typedef = `export type MonochromeIconNames = ${generateUnionString(
    names[Types.Mono],
  )};\nexport type MulticolorIconNames = ${generateUnionString(
    names[Types.Multi],
  )};\nexport type IllustrationsNames = ${generateUnionString(
    names[Types.Illustration],
  )};\n`;

  await fs.writeFile(
    path.join(process.cwd(), `${BASE_DIR}/iconNames.ts`),
    typedef,
  );

  logger.info('Exporting catalog for storybook...');

  await fs.writeFile(
    path.join(process.cwd(), `${BASE_DIR}/catalog.json`),
    JSON.stringify(names),
  );

  logger.success(
    'Done! Now use <Icon /> component to insert icons into your layout or run storybook to find the icon needed!',
  );
}

main();