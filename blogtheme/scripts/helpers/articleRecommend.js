/*
* transplanted from hexo-theme-volantis
* ArticleRec.js
*/

const ArticleLibrary = [];
const Corpus = [];
let label = null;

hexo.extend.filter.register('template_locals', function (localVar) {
  const cfg = hexo.theme.config.recommended_article;
  if (!cfg.enable) {
    return localVar;
  }
  if (!label) {
    label = 1
    getData(localVar.site.posts, cfg)
    ArticleRec(cfg)
  }
  return localVar;
});

function getData(s, cfg) {
  s.each(function (p) {
    if (["post", "docs"].includes(p.layout)) {
      ArticleLibrary.push({
        path: p.path,
        title: p.title || p.seo_title || p.short_title,
        headimg: p.thumbnail || p.banner || p.cover || cfg.placeholder_img,
      })
      Corpus.push(participle(p.raw))
    }
  })
}

function cleanData(data) {
  const punctuation = [
    ",", ".", "?", "!", ":", ";", "、", "……", "~", "&", "@", "#", "，", "。", "？", "！", "：", "；", "·", "…", "～", "＆", "＠", "＃", "“", "”", "‘", "’", "〝", "〞", "\"", "'", "＂", "＇", "´", "＇", "(", ")", "【",
    "】", "《", "》", "＜", "＞", "﹝", "﹞", "<", ">", "(", ")", "[", "]", "«", "»", "‹", "›", "〔", "〕", "〈", "〉", "{", "}", "［", "］", "「", "」", "｛", "｝", "〖", "〗", "『", "』", "︵", "︷", "︹", "︿", "︽", "﹁",
    "﹃", "︻", "︗", "/", "|", "\\", "︶", "︸", "︺", "﹀", "︾", "﹂", "﹄", "﹄", "︼", "︘", "／", "｜", "＼",
    "_", "¯", "＿", "￣", "﹏", "﹋", "﹍", "﹉", "﹎", "﹊", "`", "ˋ", "¦", "︴", "¡", "¿", "^", "ˇ", "­", "¨", "ˊ", " ", "　",
    "%", "*", "-", "+", "=", "￥", "$", "（", "）"
  ]
  data = data.replace(/\s/g, " ")
  data = data.replace(/\!\[(.*?)\]\(.*?\)/g, (_a, b) => { return b })
  data = data.replace(/(http|ftp|https):\/\/[\w\-_]+(\.[\w\-_]+)+([\w\-\.,@?^=%&amp;:/~\+#]*[\w\-\@?^=%&amp;/~\+#])?/g, " ")
  for (const mark of punctuation) {
    data = data.replace(new RegExp("\\" + mark, "g"), " ")
  }
  data = data.replace(/\d+/g, " ")
  data = data.replace(/\s/g, " ")
  return data
}

function participle(data) {
  const Stuttering = require("nodejieba");
  return Stuttering.cut(cleanData(data), true).filter(w => w !== " " && !/^[0-9]*$/.test(w))
}

function CosineSimilarity(vector1, vector2) {
  let Molecular = 0;
  let Root1 = 0;
  let Root2 = 0;
  if (vector1.length == vector2.length) {
    for (let i = 0; i < vector1.length; i++) {
      Molecular += (vector1[i] * vector2[i])
      Root1 += (vector1[i] * vector1[i])
      Root2 += (vector2[i] * vector2[i])
    }
    return Molecular / (Math.sqrt(Root1) * Math.sqrt(Root2))
  }
}


function ArticleRec(cfg) {
  const dataSet = {};
  const SimilaritySet = {};
  const Collection = {}
  let Allwords = [];

  for (let i = 0; i < Corpus.length; i++) {
    const ParticipleList = Corpus[i];
    Allwords = [...new Set(Allwords.concat(ParticipleList))]
  }
  const WordsList = {}
  Allwords.forEach(e => {
    WordsList[e] = 0
  })
  const LibraryWords = JSON.parse(JSON.stringify(WordsList))
  for (let i = 0; i < Corpus.length; i++) {
    const articlePath = ArticleLibrary[i].path;
    const articleWords = Corpus[i];

    const WordFrequency = articleWords.reduce((wordsObj, wordsName) => {
      if (wordsName in wordsObj) {
        wordsObj[wordsName]++;
      }
      return wordsObj
    }, JSON.parse(JSON.stringify(WordsList)))

    dataSet[articlePath] = {};
    dataSet[articlePath]["Frequency"] = JSON.parse(JSON.stringify(WordsList));
    for (const word of Object.keys(WordsList)) {
      dataSet[articlePath]["Frequency"][word] = WordFrequency[word] / articleWords.length;
      if (WordFrequency[word]) {
        LibraryWords[word]++;
      }
    }
  }

  for (let i = 0; i < Corpus.length; i++) {
    const articlePath = ArticleLibrary[i].path;
    dataSet[articlePath]["InverseDocumentFrequency"] = JSON.parse(JSON.stringify(WordsList));
    dataSet[articlePath]["WordInverseDocumentFrequency"] = JSON.parse(JSON.stringify(WordsList));
    dataSet[articlePath]["WordFrequencyVectors"] = []
    for (const word of Object.keys(WordsList)) {
      const InverseDocumentFrequency = Math.log(Corpus.length / (LibraryWords[word] + 1))
      const inverseFrequency = dataSet[articlePath]["Frequency"][word] * InverseDocumentFrequency
      dataSet[articlePath]["WordFrequencyVectors"].push(inverseFrequency)
    }
  }
  for (let i = 0; i < Corpus.length; i++) {
    const path1 = ArticleLibrary[i].path;
    SimilaritySet[path1] = {}
    for (let j = 0; j < Corpus.length; j++) {
      const path2 = ArticleLibrary[j].path;
      SimilaritySet[path1][path2] = CosineSimilarity(dataSet[path1]["WordFrequencyVectors"], dataSet[path2]["WordFrequencyVectors"]);
    }
    for (let j = 0; j < Corpus.length; j++) {
      Collection[path1] = Object.keys(SimilaritySet[path1]).sort(function (a, b) {
        return SimilaritySet[path1][b] - SimilaritySet[path1][a];   // desc
      })
    }
    const index = Collection[path1].indexOf(path1);
    if (index > -1) {
      Collection[path1].splice(index, 1);
    }
    Collection[path1] = Collection[path1].slice(0, cfg.max_count);
    for (let j = 0; j < Collection[path1].length; j++) {
      const e = Collection[path1][j];
      Collection[path1][j] = ArticleLibrary.filter(w => w.path == e)[0]
    }
  }
  hexo.locals.set('Collection', function () {
    return  Collection
  });
  // console.log(hexo.locals.get('Collection'));
}


hexo.extend.helper.register('helloe', function (post) {
  var posts =   hexo.locals.get('posts') 
  console.info(posts)
});

hexo.extend.helper.register('ArticleGenerator', function (post) {
  if (!post) return '';
  const cfg = hexo.theme.config.recommended_article;
  if (!cfg.enable) {
    return "";
  }
  for (const dir of cfg.skip_dirs) {
    if (new RegExp("^" + dir, "g").test(post.path)) {
      return "";
    }
  }
  const Collection = hexo.locals.get('Collection');
  const RecommendedArticle = Collection[post.path];
  return UserView(RecommendedArticle, cfg);
});

function UserView(RecommendedArticle, cfg) {
  let html = ""
  for (const item of RecommendedArticle) {
    html += ItemView(item)
  }
  return `<div class="recommended-article">
  <div class="recommended-article-header">
    <i class="${cfg.icon} fa-fw" aria-hidden="true"></i><span>${cfg.title}</span>
  </div>
  <div class="recommended-article-group">${html}</div>
</div>`
}

function ItemView(item) {
  return `<a class="recommended-article-item" href="${hexo.config.root + item.path}" title="${item.title}" rel="bookmark">
  <img src="${item.headimg}" alt="${item.title}">
  <span class="title">${item.title}</span>
</a>`
}