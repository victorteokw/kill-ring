import {
	ExtensionContext, commands, window, Range, Position, Selection
} from 'vscode';
import Ring from './ring';
import Item from './item';
import Content from './content';
import Source from './source';

let ring: Ring | undefined;
let nextYankPopIndex: number = 1;

export function activate(context: ExtensionContext) {

  ring = new Ring();

	let disposable;

	disposable = commands.registerCommand('killRing.killLine', () => {
		const editor = window.activeTextEditor;
		if (!editor) return;
		let hasSelection, hasKillable;
		for (const sel of editor.selections) {
			if (!sel.isEmpty) {
				hasSelection = true;
				break;
			}
			if (!editor.document.lineAt(sel.active).range.end.isEqual(sel.active)) {
				hasKillable = true;
			}
		}
		// do delete selections
		if (hasSelection) {
			const contents: Content[] = [];
			editor.edit((editBuilder) => {
				for (const sel of editor.selections) {
					if (!sel.isEmpty) {
						editBuilder.delete(sel);
						contents.push(new Content(
							editor.document.offsetAt(sel.start),
							editor.document.offsetAt(sel.end),
							editor.document.getText(sel)
						));
					} else {
						const pos = editor.document.offsetAt(sel.start);
						contents.push(new Content(pos, pos, ''));
					}
				}
				return true;
			});
			const item = new Item(Source.KILL, editor.document.uri.toString(), contents);
			(<Ring>ring).append(item);
			return;
		}
		// do kill to current end of lines
		if (hasKillable) {
			const contents: Content[] = [];
			editor.edit((editBuilder) => {
				for (const sel of editor.selections) {
					const line = editor.document.lineAt(sel.active.line);
					if (sel.active.isEqual(line.range.end)) {
						const pos = editor.document.offsetAt(sel.active);
						contents.push(new Content(pos, pos, ''));
					} else {
						const deleteRange = new Range(sel.active, line.range.end);
						editBuilder.delete(deleteRange);
						contents.push(new Content(
							editor.document.offsetAt(deleteRange.start),
							editor.document.offsetAt(deleteRange.end),
							editor.document.getText(deleteRange)
						));
					}
				}
				const item = new Item(Source.KILL, editor.document.uri.toString(), contents);
				(<Ring>ring).append(item);
				return true;
			});
			return;
		}
		// join next line
		const contents: Content[] = [];
		editor.edit((editBuilder) => {
			for (const sel of editor.selections) {
				const line = editor.document.lineAt(sel.active.line);
				if (line.lineNumber === editor.document.lineCount) {
					const pos = editor.document.offsetAt(sel.active);
					contents.push(new Content(pos, pos, ''));
				} else {
					const to = new Position(sel.active.line + 1, 0);
					const deleteRange = new Range(sel.active, to);
					editBuilder.delete(deleteRange);
					const startOffset = editor.document.offsetAt(sel.active);
					const endOffset = editor.document.offsetAt(to);
					contents.push(new Content(startOffset, endOffset, editor.document.getText(deleteRange)));
				}
			}
			const item = new Item(Source.KILL, editor.document.uri.toString(), contents);
			(<Ring>ring).append(item);
			return true;
		});
		return;
	});
	context.subscriptions.push(disposable);

	disposable = commands.registerCommand('killRing.killRegion', () => {
		const editor = window.activeTextEditor;
		if (!editor) return;
		let hasSelection = false;
		for (const sel of editor.selections) {
			if (!sel.isEmpty) {
				hasSelection = true;
				break;
			}
		}
		if (!hasSelection) return;
		const contents: Content[] = [];
		editor.edit((editBuilder) => {
			for (const sel of editor.selections) {
				if (!sel.isEmpty) {
					editBuilder.delete(sel);
					contents.push(new Content(
						editor.document.offsetAt(sel.start),
						editor.document.offsetAt(sel.end),
						editor.document.getText(sel)
					));
				} else {
					const pos = editor.document.offsetAt(sel.start);
					contents.push(new Content(pos, pos, ''));
				}
			}
			return true;
		});
		const item = new Item(Source.KILL, editor.document.uri.toString(), contents);
		(<Ring>ring).append(item);
	});
	context.subscriptions.push(disposable);

	disposable = commands.registerCommand('killRing.killRingSave', () => {
		const editor = window.activeTextEditor;
		if (!editor) return;
		let hasSelection = false;
		for (const sel of editor.selections) {
			if (!sel.isEmpty) {
				hasSelection = true;
				break;
			}
		}
		if (!hasSelection) return;
		const contents: Content[] = [];
		for (const sel of editor.selections) {
			if (!sel.isEmpty) {
				contents.push(new Content(
					editor.document.offsetAt(sel.start),
					editor.document.offsetAt(sel.end),
					editor.document.getText(sel)
				));
			} else {
				const pos = editor.document.offsetAt(sel.start);
				contents.push(new Content(pos, pos, ''));
			}
		}
		const item = new Item(Source.KILL, editor.document.uri.toString(), contents);
		(<Ring>ring).append(item);
	});
	context.subscriptions.push(disposable);

	disposable = commands.registerCommand('killRing.yank', () => {
		const editor = window.activeTextEditor;
		if (!editor) return;
		if ((<Ring>ring).length === 0) return;
		const item = (<Ring>ring).getItem();
		// Insert content for each cursor
		if (editor.selections.length === item.contents.length) {
			editor.edit((editBuilder) => {
				editor.selections.forEach((sel, index) => {
					editBuilder.insert(sel.active, item.contents[index].content);
				});
				return true;
			});
		// Insert all content for each cursor
		} else {
			const content = item.contents.reduce((r, c) => r + c.content, '');
			editor.edit((editBuilder) => {
				editor.selections.forEach((sel) => {
					editBuilder.insert(sel.active, content);
				});
				return true;
			});
		}
		nextYankPopIndex = 1;
	});
	context.subscriptions.push(disposable);

	disposable = commands.registerCommand('killRing.yankPop', () => {
		const editor = window.activeTextEditor;
		if (!editor) return;
		if (nextYankPopIndex >= (<Ring>ring).length) return;
		const deleteItem = (<Ring>ring).getItem(nextYankPopIndex - 1);
		const insertItem = (<Ring>ring).getItem(nextYankPopIndex);
		const cursorCount = editor.selections.length;
		const deleteEach = deleteItem.contents.length === cursorCount;
		const insertEach = insertItem.contents.length === cursorCount;
		const deleteLength = deleteEach ? 0 : deleteItem.contents.reduce((r, c) => r + c.content, '').length;
		const insertContent = insertEach ? '' : insertItem.contents.reduce((r, c) => r + c.content, '');
		editor.edit((editBuilder) => {
			editor.selections.forEach((sel, index) => {
				const from = editor.document.positionAt(editor.document.offsetAt(sel.active) - (deleteEach ? deleteItem.contents[index].content.length : deleteLength));
				editBuilder.delete(new Selection(from, sel.active));
				editBuilder.insert(from, insertEach ? insertItem.contents[index].content : insertContent);
			});
			return true;
		});
		nextYankPopIndex += 1;
	});
	context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {
	ring = undefined;
	nextYankPopIndex = 1;
}
