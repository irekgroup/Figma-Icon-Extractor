
// для работы с сетевыми запросами
const superagent = require('superagent');

// для формирования путей для выгрузки иконки
const path = require('path');

// для работы с файловой системой
const fs = require('fs/promises');

const logger = require('./logger.js')
require('dotenv').config({path: '.env.local'} );

const { FIGMA_TOKEN } = process.env;

const FIGMA_API_HOST = 'https://api.figma.com/v1';

const PAGE_NAME = 'Icons';
const BASE_DIR = '/static';

const { FIGMA_KEY } = process.env;
const CONTAINER_NODE_TYPE = 'FRAME';
const ICON_NODE_TYPE = 'COMPONENT';

const Types = {
  /* Positive: "positive",
  Negative: "negative",
  Stub: "stub",
  Unknown: "unknown", */
  Mono: "mono",
  Multi: "multi",
  Illustration: "illustration",
  Stub: "stub",
  Unknown: "unknown",
};

const DIRECTORIES_BY_TYPES = {
  [Types.Positive]: 'positive/',
  [Types.Negative]: 'negative/',
}

const PREFIXES = {
  /*   [Types.Positive]: "positive-",
    [Types.Negative]: "negative-",
    [Types.Stub]: "stub-", */
    [Types.Mono]: "mono-",
    [Types.Multi]: "multi-",
    [Types.Illustration]: "illustration-",
    [Types.Stub]: "stub-",

  };

  const getTypeByPrefix = (name) => {
    return Object.entries(PREFIXES).reduce((acc, [type, prefix]) => {
      if (acc !== Types.Unknown) {
        return acc;
      }

      if (name.startsWith(prefix)) {
        return type;
      }
    }, Types.Unknown);
  };

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



async function main() {


    if (!FIGMA_TOKEN) {
      console.error(
        "No figma token found! Make sure FIGMA_TOKEN is in your .env file or is in your environment variables"
      );
      process.exit(1);
    }
    let figmaDocument;

  try {
    figmaDocument = (
      await agent
        .get(`${FIGMA_API_HOST}/files/${FIGMA_KEY}`)
        .set('X-FIGMA-TOKEN', FIGMA_TOKEN)
    ).body;
  } catch (error) {
    console.error('Something terrible happened!');
    console.log(error);
    process.exit(1);
  }

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
    }, []);
    console.log(iconNodes);

  }

  main();