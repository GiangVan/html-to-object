

const SELF_CLOSING_TAGS = [
	'area',
	'base',
	'br',
	'col',
	'embed',
	'hr',
	'img',
	'input',
	'link',
	'meta',
	'param',
	'source',
	'track',
	'wbr',
	'command',
	'keygen',
	'menuitem',

	'path',
	'circle',
	'rect',
	'polygon',
	'stop',
	'ellipse',
];

const CONTENT_TAGS = [
	'script',
	'style',
];


class TagObject {
	constructor(data) {
		this.openTagStartIndex = data.openTagStartIndex;
		this.openTagEndIndex = data.openTagEndIndex;
		this.closeTagIndex = data.closeTagIndex;
		this.endTagIndex = data.endTagIndex;
		this.innerHTML = data.innerHTML;
		this.content = data.content;
		this.tagName = data.tagName;
		this.attributes = data.attributes;
		this.childs = data.childs;
		// this.parent = data.parent;
		// this.resourceHTML = data.resourceHTML;
	}

	toString() {
		return this._toStringRecursive(this);
	}

	_toStringRecursive(tagObj) {
		if (tagObj.tagName === '!--') {
			return `<!--${(tagObj.content[0]) ? tagObj.content[0] : ''}-->`;
		} else if (CONTENT_TAGS.find((tagName) => tagName.toUpperCase() === tagObj.tagName.toUpperCase())) {
			//generate head of open tag
			let attributesString = '';
			tagObj.attributes.forEach((item) => {
				attributesString += `${item.raw} `;
			});
			//content
			let content = (tagObj.content[0]) ? tagObj.content[0] : '';
			//
			return `<${tagObj.tagName} ${attributesString}>${content}</${tagObj.tagName}>`;
		} else {
			if (SELF_CLOSING_TAGS.find((tagName) => tagName.toUpperCase() === tagObj.tagName.toUpperCase())) {
				//generate head of open tag
				let attributesString = '';
				tagObj.attributes.forEach((item) => {
					attributesString += `${item.raw} `;
				});
				//
				return `<${tagObj.tagName} ${attributesString}>`;
			} else {
				//generate head of open tag
				let attributesString = '';
				tagObj.attributes.forEach((item) => {
					attributesString += `${item.raw} `;
				});
				//inner HTML
				let innerString = tagObj.content[0] ? tagObj.content[0] : '';
				for (let i = 0; i < tagObj.childs.length; i++) {
					innerString += this._toStringRecursive(tagObj.childs[i]);
					innerString += tagObj.content[i + 1] ? tagObj.content[i + 1] : '';
				}
				//
				return `<${tagObj.tagName} ${attributesString}>${innerString}</${tagObj.tagName}>`;
			}
		}
	}

	search(callback) {
		const result = [];
		if (this.childs.length > 0) {
			this._searchRecursive(callback, result, this.childs);
		}

		return result;
	}

	_searchRecursive(callback, result, childs) {
		childs.forEach((item) => {
			if (callback(item)) {
				result.push(item);
			}
			if (item.childs.length > 0) {
				this._searchRecursive(callback, result, item.childs);
			}
		});
	}
}

class TagObjectAttribute {
	constructor(data) {
		this.key = data.key;
		this.value = data.value;
		this.raw = data.raw;
	}
}

function getTagName(htmlString, index) {
	//index is start position of open tag
	index += 1;
	htmlString = htmlString.split('\n').join(' ').split('\t').join(' ');
	const MAX = htmlString.length + 1;
	const endIndex1 = (htmlString.indexOf(' ', index) > -1) ? htmlString.indexOf(' ', index) : MAX;
	const endIndex2 = (htmlString.indexOf('>', index) > -1) ? htmlString.indexOf('>', index) : MAX;
	return (endIndex1 === MAX && endIndex2 === MAX) ? '' : htmlString.substring(index, Math.min(endIndex1, endIndex2));
}

function getEndIndexOfOpenTag(htmlString, index) {
	//index is start position of open tag
	const MAX = htmlString.length + 1;
	const index1 = (htmlString.indexOf('>', index) > -1) ? htmlString.indexOf('>', index) : MAX;
	const index2 = (htmlString.indexOf('/>', index) > -1) ? htmlString.indexOf('/>', index) : MAX;
	return (index1 === MAX && index2 === MAX) ? (-1) : Math.min(index1, index2);
}

function parseAttributes(tagHeadString) {
	const TEMPLATE = `  asdf   sadf=1    sadfasd='123'   asdf="adsfasdf"   `;
	const attributes = [];
	const SPACE = " ";
	tagHeadString = tagHeadString.split('\n').join(SPACE).split('\t').join(SPACE);

	while (true) {
		if (removeFirstSymbol(tagHeadString, SPACE) === null) {
			const endIndex = tagHeadString.indexOf(SPACE);

			if (endIndex > -1) {
				if (tagHeadString.substring(0, endIndex)) {
					attributes.push(new TagObjectAttribute({
						key: null,
						value: null,
						raw: tagHeadString.substring(0, endIndex),
					}));
					tagHeadString = tagHeadString.substring(endIndex + 1, tagHeadString.length);
				}
			} else {
				if (tagHeadString.substring(0, tagHeadString.length)) {
					attributes.push(new TagObjectAttribute({
						key: null,
						value: null,
						raw: tagHeadString.substring(0, tagHeadString.length),
					}));
				}

				return attributes;
			}
		} else {
			tagHeadString = removeFirstSymbol(tagHeadString, SPACE);
		}
	}
}

function removeFirstSymbol(str, symbol) {
	if (str.indexOf(symbol) === 0) {
		return str.substring(symbol.length, str.length);
	} else {
		return null;
	}
}

function generateTagObject(htmlString) {
	if (htmlString.indexOf('<!DOCTYPE html>')) {
		htmlString = htmlString.substring(htmlString.indexOf('<!DOCTYPE html>') + '<!DOCTYPE html>'.length, htmlString.length);
	}
	return _generateTagObjectRecursive(htmlString);
}

function pushContent(contents, value) {
	if (value && value !== '>') {
		contents.push(value);
	}
}

function _generateTagObjectRecursive(htmlString, index = 0, parent = null) {
	index = htmlString.indexOf('<', index);

	if (index > -1) {
		const tagObj = new TagObject({
			resourceHTML: htmlString,
			openTagStartIndex: index,
			openTagEndIndex: getEndIndexOfOpenTag(htmlString, index),
			closeTagIndex: -1,
			endTagIndex: -1,
			parent: parent,
			innerHTML: '',
			content: [],
			tagName: getTagName(htmlString, index),
			attributes: [],
			childs: []
		});

		if (CONTENT_TAGS.find((tagName) => tagName.toUpperCase() === tagObj.tagName.toUpperCase())) {
			tagObj.attributes = parseAttributes(htmlString.substring(tagObj.openTagStartIndex + `<${tagObj.tagName}`.length, tagObj.openTagEndIndex));
			tagObj.closeTagIndex = htmlString.indexOf(`</${tagObj.tagName}>`, tagObj.openTagStartIndex);
			tagObj.endTagIndex = tagObj.closeTagIndex + `</${tagObj.tagName}>`.length;
			pushContent(tagObj.content, htmlString.substring(tagObj.openTagEndIndex + '>'.length, tagObj.closeTagIndex));
		} else if (tagObj.tagName === '!--') {
			tagObj.openTagEndIndex = htmlString.indexOf('-->', tagObj.openTagStartIndex);
			tagObj.endTagIndex = tagObj.openTagEndIndex + '-->'.length;
			pushContent(tagObj.content, htmlString.substring(tagObj.openTagStartIndex + '<!--'.length, tagObj.openTagEndIndex));
		} else {
			tagObj.attributes = parseAttributes(htmlString.substring(tagObj.openTagStartIndex + `<${tagObj.tagName}`.length, tagObj.openTagEndIndex));

			//get innerHTML
			if (SELF_CLOSING_TAGS.find((tagName) => tagName.toUpperCase() === tagObj.tagName.toUpperCase())) {
				tagObj.endTagIndex = tagObj.openTagEndIndex + (htmlString.indexOf('>', tagObj.openTagEndIndex) - tagObj.openTagEndIndex);
			} else {
				index = tagObj.openTagEndIndex + '>'.length;
				while (true) {
					if (htmlString.indexOf('<', index) < htmlString.indexOf('</', index)) {
						//if exist child
						pushContent(tagObj.content, htmlString.substring(index, htmlString.indexOf('<', index)));

						const childTagObj = _generateTagObjectRecursive(htmlString, index, tagObj);
						if (childTagObj) {
							tagObj.childs.push(childTagObj);
							index = childTagObj.endTagIndex;
						} else {
							alert('error: childTagObj === null');
						}
					} else {
						tagObj.closeTagIndex = htmlString.indexOf(`</${tagObj.tagName}>`, index);
						tagObj.endTagIndex = tagObj.closeTagIndex + `</${tagObj.tagName}>`.length;
						tagObj.innerHTML = htmlString.substring(tagObj.openTagEndIndex + '>'.length, tagObj.closeTagIndex);
						pushContent(tagObj.content, htmlString.substring(index, tagObj.closeTagIndex));

						break;
					}
				}
			}
		}

		return tagObj;
	}

	return null
}

function display(html) {
	const el = document.createElement('pre');
	tagObj = generateTagObject(html);
	document.body.innerHTML = '';
	el.innerText = JSON.stringify(tagObj, null, 4).split('\\n').join('').split('\\t').join('');
	document.body.append(el);
}