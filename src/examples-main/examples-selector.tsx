import * as React from 'react';
import * as ReactDOM from 'react-dom';
import {examplesList} from 'examples/data-examples';

interface WindowExt extends Window {
  module: any;
}
declare var window: WindowExt;

interface Folder {
  path: string;
  files: number[];
}

var header = document.createElement('div');
header.id = 'top';
header.style.margin = '5px';
document.body.appendChild(header);

function getFolders(examples: string[]) {
  let pathsMap = {};
  examples.forEach((item) => {
    let path = item.substr(0, item.lastIndexOf('/') + 1);
    let file = item.substr(path.length);

    let files = pathsMap[path] || (pathsMap[path] = []);
    files.push(file);
  });

  let folders = [];
  for (let path in pathsMap) {
    let files = pathsMap[path];
    files.sort();
    folders.push({path: path, files: files});
  }

  return folders;
}

let examples = examplesList.map((item) => item);
var folders = getFolders(examples);

let spaces = [];
while (spaces.length < 4)
  spaces.push(String.fromCharCode(160));

function moduleToOption(file) {
  return spaces.concat(file);
}

function optionToModule(option) {
  let pair = option.split('-').map((i) => parseInt(i, 10));
  return pair;
}

function renderFolders(parent: HTMLElement, folders: Folder[], sel: number[]) {
  let options = [];
  folders.forEach((folder, folderIdx) => {
    options.push(<option key={folderIdx} disabled={true}>{folder.path}</option>);
    folder.files.forEach((file, fileIdx) => {
      options.push(
        <option key={[folderIdx, fileIdx].join('-')} value={[folderIdx, fileIdx].join('-')}>
          {moduleToOption(file)}
        </option>);
    });
  });

  ReactDOM.render(<div>
    Selected example: <select defaultValue={sel.join('-')} style={{width: '50%'}} onChange={onSelectExample}>
      {options}
    </select>
  </div>, parent);
}

function parseSelectionFromUrl() {
  let selection = location.href.split('#')[1] || '';

  let params = selection.split('&');
  for (let n = 0; n < params.length; n++) {
    let keyVal = params[n].split('=');
    if (keyVal[0] == 'selection')
      return keyVal[1].split(':').map((value) => +value);
  }

  return [0, 0];
}

let lastModule = '';
export function onSelectExample(event) {
  let folderFilePair = optionToModule(event.target.value);

  let selection = folderFilePair.join(':');
  try {
    window.history.pushState({
      folderIdx: folderFilePair[0],
      fileIdx: folderFilePair[1]
    }, 'example ' + selection, '#selection=' + selection);
  } catch (e) {
    location.href = '#selection=' + selection;
  }
  loadExample(folderFilePair);
}

function clearBody() {
  while (document.body.firstChild) {
    document.body.removeChild(document.body.lastChild);
  }
}

function showHeader() {
  document.body.insertBefore(header, document.body.firstChild);
}

function loadExample(sel?: number[]) {
  sel = sel || parseSelectionFromUrl();
  let folder = folders[sel[0]];
  let module = folder.path + folder.files[sel[1]];
  lastModule && requirejs.undef(lastModule);
  lastModule = module;

  clearBody();
  try {
    requirejs([module], (m) => {
      window.module = m;
      showHeader();
    });
  } catch (e) {
    console.log(e);
  }
}

window.addEventListener('popstate', (event) => {
  let sel = parseSelectionFromUrl();
  renderFolders(header, folders, sel);
  loadExample(sel);
});

let sel = parseSelectionFromUrl();
renderFolders(header, folders, sel);
loadExample(sel);
