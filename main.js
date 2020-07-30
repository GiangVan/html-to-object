


class TagObject {
	static SELF_CLOSING_TAGS = [
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

	static CONTENT_TAGS = [
		'script',
		'style',
	];

	#innerHTML;

	constructor(data) {
		if ((typeof data).toLowerCase() === 'string') {
			data = this.#generateTagObject(data);
		}

		this.startIndexOfOpenTag = data.startIndexOfOpenTag;
		this.endIndexOfOpenTag = data.endIndexOfOpenTag;
		this.endIndexOfTag = data.endIndexOfTag;
		this.endTagIndex = data.endTagIndex;
		this.endTypeOfOpenTag = data.endTypeOfOpenTag;
		this.#innerHTML = data.updatedInnerHTML ? data.updatedInnerHTML : data.innerHTML;
		this.tagName = data.tagName;
		this.rawAttributes = data.rawAttributes;
		this.attributes = data.attributes;
		this.childs = data.childs;
		this.contents = data.contents;
		this.parent = data.parent;
	}


	#generateTagObject(htmlString) {
		if (htmlString.substring(0, '<!DOCTYPE html>'.length).toUpperCase() === '<!DOCTYPE html>'.toLowerCase()) {
			htmlString = htmlString.substring('<!DOCTYPE html>'.length, htmlString.length);
		}
		return this.#generateTagObjectRecursive(htmlString);
	}

	#generateTagObjectRecursive(htmlString, index = 0, parent = null) {
		index = htmlString.indexOf('<', index);

		if (index > -1) {
			const tagObj = {
				startIndexOfOpenTag: index,
				endIndexOfOpenTag: this.#getEndIndexOfOpenTag(htmlString, index),
				endIndexOfTag: -1,
				endTagIndex: -1,
				endTypeOfOpenTag: '>',
				parent: parent,
				innerHTML: '',
				updatedInnerHTML: undefined,
				tagName: this.#getTagName(htmlString, index),
				attributes: [],
				rawAttributes: '',
				contents: [],
				childs: [],
			};

			if (this.#isContentTag(tagObj.tagName)) {
				tagObj.rawAttributes = htmlString.substring(tagObj.startIndexOfOpenTag + `<${tagObj.tagName}`.length, tagObj.endIndexOfOpenTag);
				tagObj.attributes = this.#parseAttributes(tagObj.rawAttributes);
				tagObj.endIndexOfTag = htmlString.indexOf(`</${tagObj.tagName}>`, tagObj.startIndexOfOpenTag);
				tagObj.endTagIndex = tagObj.endIndexOfTag + `</${tagObj.tagName}>`.length;
				tagObj.updatedInnerHTML = htmlString.substring(tagObj.endIndexOfOpenTag + '>'.length, tagObj.endIndexOfTag);
			} else if (this.#isCommentTag(tagObj.tagName)) {
				tagObj.endIndexOfOpenTag = htmlString.indexOf('-->', tagObj.startIndexOfOpenTag);
				tagObj.endTagIndex = tagObj.endIndexOfOpenTag + '-->'.length;
				tagObj.updatedInnerHTML = htmlString.substring(tagObj.startIndexOfOpenTag + '<!--'.length, tagObj.endIndexOfOpenTag);
			} else {
				tagObj.rawAttributes = htmlString.substring(tagObj.startIndexOfOpenTag + `<${tagObj.tagName}`.length, tagObj.endIndexOfOpenTag);
				tagObj.attributes = this.#parseAttributes(tagObj.rawAttributes);

				//get innerHTML
				if (this.#isSelfClosingTag(tagObj.tagName)) {
					// set end type of open tag
					if (htmlString.indexOf('>', tagObj.endIndexOfOpenTag) !== tagObj.endIndexOfOpenTag) {
						tagObj.endTypeOfOpenTag = '/>';
					}
					tagObj.endTagIndex = tagObj.endIndexOfOpenTag + tagObj.endTypeOfOpenTag.length;
				} else {
					index = tagObj.endIndexOfOpenTag + '>'.length;
					this.#pushAllChildTagsAndContents(htmlString, tagObj, index);
				}
			}

			return tagObj;
		}

		return null;
	}

	#pushAllChildTagsAndContents(htmlString, tagObj, index) {
		while (true) {
			if (htmlString.indexOf('<', index) < htmlString.indexOf('</', index)) {
				//if exist child

				const childTagObj = new TagObject(this.#generateTagObjectRecursive(htmlString, index, tagObj));
				if (childTagObj) {
					this.#pushContent(tagObj.contents, htmlString.substring(index, htmlString.indexOf('<', index)), childTagObj);
					tagObj.childs.push(childTagObj);

					index = childTagObj.endTagIndex;
				} else {
					alert('error: childTagObj === null');
				}
			} else {
				tagObj.endIndexOfTag = htmlString.indexOf(`</${tagObj.tagName}>`, index);
				tagObj.endTagIndex = tagObj.endIndexOfTag + `</${tagObj.tagName}>`.length;
				tagObj.updatedInnerHTML = htmlString.substring(tagObj.endIndexOfOpenTag + '>'.length, tagObj.endIndexOfTag);
				this.#pushContent(tagObj.contents, htmlString.substring(index, tagObj.endIndexOfTag));

				break;
			}
		}
	}

	getRawInnerHTML() {
		return this.#innerHTML;
	}

	updateInnerHTML(innerHTML) {
		this.#innerHTML = innerHTML;
	}

	get innerHTML() {
		if (this.#isContentTag(this.tagName) || this.#isCommentTag(this.tagName)) {
			return this.#innerHTML;
		} else if (this.#isSelfClosingTag(this.tagName)) {
			return null;
		} else {
			return this.#fetchInnerHTML(this);
		}
	}

	set innerHTML(htmlString) {
		if (this.#isContentTag(this.tagName) || this.#isCommentTag(this.tagName)) {
			this.#innerHTML = htmlString;
		} else if (this.#isSelfClosingTag(this.tagName)) {
			alert('cannot set innerHTML for a Self-closing tag');
		} else {
			this.contents = [];
			this.childs = [];

			htmlString += `</${this.tagName}>`;
			this.#pushAllChildTagsAndContents(htmlString, this, 0);
		}
	}

	#isContentTag(tagName) {
		return TagObject.CONTENT_TAGS.find((name) => (name.toUpperCase() === tagName.toUpperCase()));
	}

	#isCommentTag(tagName) {
		return tagName === '!--';
	}

	#isSelfClosingTag(tagName) {
		return TagObject.SELF_CLOSING_TAGS.find((name) => (name.toUpperCase() === tagName.toUpperCase()));
	}

	toString() {
		return this.#toStringRecursive(this);
	}

	#toStringRecursive(tagObj) {
		if (this.#isCommentTag(tagObj.tagName)) {
			return `<!--${tagObj.innerHTML}-->`;//////////////////////////////detect other end type of comment tag
		} else if (this.#isContentTag(tagObj.tagName)) {
			//generate head of open tag
			const attributesString = tagObj.rawAttributes;
			// let attributesString = '';
			// tagObj.attributes.forEach((item) => {
			// 	attributesString += ` ${item.raw}`;
			// });
			//
			return `<${tagObj.tagName}${attributesString}>${tagObj.innerHTML}</${tagObj.tagName}>`;
		} else {
			if (this.#isSelfClosingTag(tagObj.tagName)) {
				//generate head of open tag
				const attributesString = tagObj.rawAttributes;
				// let attributesString = '';
				// tagObj.attributes.forEach((item) => {
				// 	attributesString += ` ${item.raw}`;
				// });
				//
				return `<${tagObj.tagName}${attributesString}${tagObj.endTypeOfOpenTag}`;
			} else {
				//generate head of open tag
				const attributesString = tagObj.rawAttributes;
				// let attributesString = '';
				// tagObj.attributes.forEach((item) => {
				// 	attributesString += ` ${item.raw}`;
				// });
				//
				const innerHTML = this.#fetchInnerHTML(tagObj);
				return `<${tagObj.tagName}${attributesString}>${innerHTML}</${tagObj.tagName}>`;
			}
		}
	}

	#fetchInnerHTML(tagObj) {
		let innerHTML = '';
		tagObj.childs.forEach((child) => {
			const content = tagObj.contents.find((content) => (content.bottomAnchorTag === child));
			innerHTML += content ? content.text : '';
			innerHTML += this.#toStringRecursive(child);
		});
		tagObj.contents.forEach((content) => {
			if (content.bottomAnchorTag == null && content.bottomAnchorContent == null) {
				innerHTML += content ? content.text : '';
			}
		});
		return innerHTML;
	}

	search(callback) {
		const result = [];
		if (this.childs.length > 0) {
			this.#searchRecursive(callback, result, this.childs);
		}

		return result;
	}

	#searchRecursive(callback, result, childs) {
		childs.forEach((item) => {
			if (callback(item)) {
				result.push(item);
			}
			if (item.childs.length > 0) {
				this.#searchRecursive(callback, result, item.childs);
			}
		});
	}

	toJson() {
		return JSON.stringify(this, (key, value) => {
			if (key === 'parent' && value) {
				return JSON.parse(JSON.stringify(value, (k, v) => (k === 'childs' || k === 'parent') ? '[circular structure]' : v));
			} else if (
				key === 'startIndexOfOpenTag' ||
				key === 'endIndexOfOpenTag' ||
				key === 'endIndexOfTag' ||
				key === 'endTagIndex'
			) {
				return undefined;
			} else {
				return value;
			}
		}, 4);
	}

	#getTagName(htmlString, index) {
		//index is start position of open tag
		index += 1;
		htmlString = htmlString.split('\n').join(' ').split('\t').join(' ');
		const MAX = htmlString.length + 1;
		const endIndex1 = (htmlString.indexOf(' ', index) > -1) ? htmlString.indexOf(' ', index) : MAX;
		const endIndex2 = (htmlString.indexOf('>', index) > -1) ? htmlString.indexOf('>', index) : MAX;
		return (endIndex1 === MAX && endIndex2 === MAX) ? '' : htmlString.substring(index, Math.min(endIndex1, endIndex2));
	}

	#getEndIndexOfOpenTag(htmlString, index) {
		//index is start position of open tag
		const MAX = htmlString.length + 1;
		const index1 = (htmlString.indexOf('>', index) > -1) ? htmlString.indexOf('>', index) : MAX;
		const index2 = (htmlString.indexOf('/>', index) > -1) ? htmlString.indexOf('/>', index) : MAX;
		return (index1 === MAX && index2 === MAX) ? (-1) : Math.min(index1, index2);
	}

	#parseAttributes(tagHeadString) {
		const TEMPLATE = `  asdf   sadf=1    sadfasd='123'   asdf="adsfasdf"   `;
		const attributes = [];
		const SPACE = " ";
		tagHeadString = tagHeadString.split('\n').join(SPACE).split('\t').join(SPACE);

		while (true) {
			if (this.#removeFirstSymbol(tagHeadString, SPACE) === null) {
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
				tagHeadString = this.#removeFirstSymbol(tagHeadString, SPACE);
			}
		}
	}

	#removeFirstSymbol(str, symbol) {
		if (str.indexOf(symbol) === 0) {
			return str.substring(symbol.length, str.length);
		} else {
			return null;
		}
	}

	#pushContent(contents, text, bottomAnchorTag) {
		if (text) {
			contents.push(new TagObjectContent({
				text: text,
				bottomAnchorTag: bottomAnchorTag,
			}));
		}
	}

}

class TagObjectAttribute {
	constructor(data) {
		this.key = data.key;
		this.value = data.value;
		this.raw = data.raw;
	}
}

class TagObjectContent {
	constructor(data) {
		this.text = data.text;
		this.bottomAnchorTag = data.bottomAnchorTag;
		this.bottomAnchorContent = data.bottomAnchorContent;
	}
}

function display(html) {
	const el = document.createElement('pre');
	tagObj = new TagObject(html);
	document.body.innerHTML = '';
	el.innerText = tagObj.toJson();
	// el.innerText = tagObj.toJson().split('\\n').join('').split('\\t').join('');
	document.body.append(el);
}

display(`
<div class="wrap">
	<div class="inner">
		1	asdfasdf
		<p id="w2" class="hdg bg-pt2"><span class="hdg-item"><span class="tag-required-pt2">条件必須</span></span></p>
		2	asdfsadf
		<div class="dtl">
			<div class="dtl-item">
				<input id="text-w2-01" type="text" name="text-w2-01" class="inp-txt size-middle" />
			</div><!-- /dtl-item -->
		</div><!-- /dtl -->
		3	asdfsdfasklf
	</div><!-- /inner -->
</div>
`)