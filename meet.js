var fileContents = "";
var htmlOutput = null;

class substitutionsViewModel {
    static REPLACEMENT_SETTINGS_KEY = "zoom-chat-tool-replacements"
    liveCopy = [];
    substitutionsChangeCallback = null;
  constructor(substitutionsChange) {
    this.substitutionsChangeCallback = substitutionsChange;
    if (substitutionsViewModel._instance) {
      return substitutionsViewModel._instance;
    }
    substitutionsViewModel._instance = this;
  }

  addReplacement(input, replacementValue){
    this.liveCopy.push({'SEARCH_KEY': input, 'REPLACEMENT_VALUE': replacementValue})
    this.persistToBrowser();
    this.substitutionsChangeCallback?.call();
  }

  applyNewSettings(newSubs){
    this.liveCopy = newSubs;
    this.persistToBrowser();
    this.substitutionsChangeCallback?.call();
  }

  reset() {
    this.liveCopy = []
    this.persistToBrowser();
    this.substitutionsChangeCallback?.call();
  }

  populateFromBrowser(){
    if (!window.localStorage){
        return;
    }

    let storedSettings = window.localStorage.getItem(substitutionsViewModel.REPLACEMENT_SETTINGS_KEY)
    if (storedSettings){
        this.liveCopy = JSON.parse(storedSettings);
    }
    if (this.substitutionsChangeCallback){
        this.substitutionsChangeCallback.call(this);
    }
  }

  persistToBrowser(){
    if (!window.localStorage) {
        console.log('cant save settings... localstorage not available');
        return;
    }
    window.localStorage.setItem(substitutionsViewModel.REPLACEMENT_SETTINGS_KEY, JSON.stringify(this.liveCopy));
  }
}

class fileViewModel {
  fileName = "";
  rawContents = "";
  filteredContents = "";
  parsedContents = [];

  mdForDisplay = null;
  htmlForDisplay = null;
  htmlForPrint = null;
  useWikiLinksInMarkdown = false;

  renderCallback = null;

  substitutions = []

  reader = new FileReader();

  constructor(renderCallback) {
    this.renderCallback = renderCallback;
    this.reader.onload = (event) => {
      this.rawContents = event.target.result;
      this.filteredContents = `${this.rawContents}`;
      this.applyFilter();
      this.parseAndRender();
    };
  }

  /*
  substitutions is [{SEARCH_KEY:key,REPLACEMENT_VALUE:value}]
  */
  applyFilter(){
    if (!this.rawContents){
        this.filteredContents = "";
        return;
    }
    if (!this.substitutions){
        return;
    }

    let replacedContents = `${this.rawContents}`
    for(var keypair of this.substitutions){
        let startSearchIndex = 0;
        let searchKey = keypair["SEARCH_KEY"]
        let replacement = keypair["REPLACEMENT_VALUE"]
        if (!searchKey){
            continue;
        }
        while (replacedContents.indexOf(searchKey, startSearchIndex) > -1){
            let currentReplacementIndex = replacedContents.indexOf(searchKey, startSearchIndex);
            replacedContents = replacedContents.substring(0, currentReplacementIndex) + 
                             replacedContents.substring(currentReplacementIndex).replace(searchKey, replacement)
            startSearchIndex  = currentReplacementIndex + replacement.length - searchKey.length;
        }
    }
    this.filteredContents = replacedContents;
  }

  parseAndRender() {
    this.applyFilter();
    this.parsedContents = this._convertToSchema(this.filteredContents);
    this.mdForDisplay = this._convertSchemaToMarkdown(this.parsedContents);
    this.htmlForDisplay = this._convertSchemaToHtml(this.parsedContents);
    this.htmlForPrint = this.htmlForDisplay.cloneNode(true);
    this.renderCallback?.call();
  }

  _getStatementStyleTwo(line){
    var splitter = line.indexOf("\t") > -1 ? "\t" : " From ";
    let fromParts = line.split(" From ", 2);
    if (fromParts.length != 2){
      console.log(line)
    }
    let statementParts = fromParts[1].split(':')
    // Handle different format
    let statement = 
    {
      timestamp: fromParts[0].trim(),
      from: statementParts[0].trim().split(":")[0],
      to: "Everyone",
      contents: statementParts[1].trim()
    };
    return statement;
  }
  _getStatementStyleThree(line){
    let parts = line.split("\t");
    let statement = 
    {
      timestamp: parts[0].trim(),
      from: parts[1].trim().split(":")[0],
      to: "Everyone",
      contents: parts.length > 2 ? parts[2].trim() : ""
    };
    return statement;
  }

  _convertToSchema(inputText) {
    let lines = inputText.split("\n");

    let statements = [];
    let statementInProgress = null;

    for (var line of lines) {
      let timeRegex = /^(([0-9]{2})\:){2}([0-9]{2})/g;
      if (line.trim() === ""){
        continue;
      }
      if (timeRegex.test(line)) {
        if (line.indexOf(" From ") > -1){
          try {
            if (statementInProgress != null){
              let splitter = null;
              if (statementInProgress.from.indexOf(" To ") > -1){
                splitter = " To ";
              }
              else if (statementInProgress.from.indexOf(" to ") > -1){
                splitter = " to "
              }
              if (splitter){
                let parts = statementInProgress.from.split(splitter);
                statementInProgress.from = parts[0].trim().split(":")[0];
                statementInProgress.to = parts[1].trim().split(":")[0];
              }
              statements.push(statementInProgress);
            }
            statementInProgress = this._getStatementStyleTwo(line);
          }
          catch(err){
            console.log(err);
            console.log(line);
          }
        }
        // line doesn't contain "From" or "to"
        else if (line.indexOf(" From ") === -1 && line.indexOf("\t") > -1){
          try {
            statements.push(this._getStatementStyleThree(line));
          }
          catch(err){
            console.log(err);
            console.log(line);
          }
        }
        else {
          if (statementInProgress != null) {
            statementInProgress.contents = statementInProgress.contents.trim();
            statements.push(statementInProgress);
          }
          statementInProgress = {
            timestamp: "",
            from: "",
            to: "",
            contents: "",
          };
          let fromParts = line.split(" From ", 2);
          statementInProgress.timestamp = fromParts[0];
          // TODO = handle cases where name contains ' to '
          let toParts = fromParts[1].split(" to ");
          statementInProgress.from = toParts[0];
          statementInProgress.to = toParts[1].split(":")[0];
        }
        
      } else if (statementInProgress != null) {
        statementInProgress.contents = `${
          statementInProgress.contents
        }\n${line.trim()}`;
      }
    }
    if (statementInProgress != null){
      statements.push(statementInProgress);
    }
    return statements;
  }

  _convertSchemaToMarkdown(inputObj) {
    var output = "";

    for (var entry of inputObj) {
      if (entry.to !== "Everyone") {
        continue;
      }

      if (this.useWikiLinksInMarkdown === true) {
        output = `${output}\n- [[${entry.from}]]: (${entry.timestamp}) ${entry.contents.trim()}`;
      } else {
        output = `${output}\n- **${entry.from}**: (${
          entry.timestamp
        }) ${entry.contents.trim()}`;
      }
    }
    return output;
  }
  _convertSchemaToHtml(inputObj) {
    var outputRoot = document.createElement("div");
    var unorderedList = document.createElement("ul");
    outputRoot.appendChild(unorderedList);
    for (var entry of inputObj) {
      if (entry.to !== "Everyone") {
        continue;
      }
      var li = document.createElement("li");
      var fromSpan = document.createElement("strong");
      fromSpan.innerText = entry.from;
      li.appendChild(fromSpan);
      let spacer = document.createElement("span");
      spacer.innerHTML = "&nbsp;";
      li.appendChild(spacer);
      let timestamp = document.createElement("span");
      timestamp.appendChild(document.createTextNode("("));
      let timestampValue = document.createElement("time");
      timestampValue.innerText = entry.timestamp;
      timestamp.appendChild(timestampValue);
      timestamp.appendChild(document.createTextNode("): "));
      li.appendChild(timestamp);
      let contents = document.createElement("span");
      contents.innerText = entry.contents;
      li.appendChild(contents);
      unorderedList.appendChild(li);
    }
    return outputRoot;
  }

  reset() {
    this.fileName = "";
    this.rawContents = null;
    thhis.parsedContents = [];
  }

  loadFromFile(file) {
    this.fileName = file.name;
    this.reader.readAsText(file);
  }
}

let fileVM = new fileViewModel(renderContent);
let substitutionVM = new substitutionsViewModel(handleSubstitutionsChanged);

function handleSubstitutionsChanged() {
    fileVM.substitutions = substitutionVM.liveCopy;
    fileVM.parseAndRender();
    renderSettingsPane();
}

function renderSettingsPane(){
    if (!substitutionVM?.liveCopy){
        return;
    }
    let container = document.createElement('ul');

    substitutionVM.liveCopy.map((input) => {
        let root = document.createElement('li');
        let searchInput = document.createElement('input');
        searchInput.value = input["SEARCH_KEY"]
        let replacementInput = document.createElement('input');
        replacementInput.className = "input-replacement-value"
        replacementInput.value = input["REPLACEMENT_VALUE"]
        root.appendChild(searchInput);
        root.appendChild(replacementInput);
        container.appendChild(root);
    });
    document.getElementById('replacement-area-root').removeEventListener('change', _handleChange)
    document.getElementById('replacement-area-root').innerHTML = "";
    document.getElementById('replacement-area-root').appendChild(container);
    container.addEventListener('change', _handleChange);
}

function _handleChange(inputEvt){
    // get root ul
    let root = document.getElementById('replacement-area-root').firstChild

    // read through li
    let keys = root.querySelectorAll('li');
    let results = [...keys].map((inputLi) => {
        let [firstInput, secondInput] = inputLi.querySelectorAll('input');
        return {"SEARCH_KEY": firstInput.value, "REPLACEMENT_VALUE": secondInput.value};
    });
    substitutionVM.applyNewSettings(results);
}

function handleObsidianLinkChange(evt) {
  enableObsidianLinks = evt.checked;
  if (fileVM) {
    fileVM.useWikiLinksInMarkdown = evt.checked;
    fileVM.parseAndRender();
  }
}

function onChange() {
  if (fileVM == null) {
    fileVM = new fileViewModel(renderContent);
  }
  const fileInput = document.getElementById("upload-button");
  const selectedFile = fileInput.files[0];
  fileVM.loadFromFile(selectedFile);
}

function renderContent() {
  document.title = `Zoom Chat: ${fileVM.fileName}`;
  const rawOutput = document.getElementById("raw-file-contents");
  const markdownView = document.getElementById("markdown-contents");
  const outputView = document.getElementById("html-output-view");
  const printView = document.getElementById("html-print-view");

  rawOutput.innerText = fileVM.rawContents;
  markdownView.innerText = fileVM.mdForDisplay;
  outputView.innerHTML = "";
  outputView.appendChild(fileVM.htmlForDisplay);
  printView.innerHTML = "";
  printView.appendChild(fileVM.htmlForPrint);
}

function handleCopyHtml(evt) {
  handleCopy(evt, fileVM.htmlForDisplay.innerHTML, true);
}
function handleCopyMd(evt) {
  handleCopy(evt, fileVM.mdForDisplay, false);
}
async function handleCopy(evt, content, useHtml) {
  if (navigator.clipboard) {
    try {
      if (useHtml) {
        const blob = new Blob([content], { type: "text/html" });
        await navigator.clipboard.write([
          new ClipboardItem({
            "text/html": blob,
          }),
        ]);

      }
      else {
        const blob = new Blob([content], { type: "text/plain"});
        await navigator.clipboard.write([
          new ClipboardItem({
            "text/plain": blob,
          }),
        ]);
      }

      return;
    } catch (ex) {
      console.dir(ex);
    }
  }
  // fallback
  let range = document.createRange();
  let contentNode = document.getElementById("html-output-view");
  range.selectNodeContents(contentNode);
  let selection = window.getSelection();

  selection.removeAllRanges();
  selection.addRange(range);
  document.execCommand("copy");
}

function handleAddReplacement() {
    substitutionVM.addReplacement('example_to_replace', 'replaced_with');
}

document
  .getElementById("copy-btn-html")
  .addEventListener("click", handleCopyHtml);
document.getElementById("copy-btn-md").addEventListener("click", handleCopyMd);
document.getElementById('btn-add-replacement').addEventListener('click', handleAddReplacement)
document.getElementById('btn-reset-settings').addEventListener('click', (evt) => substitutionVM.reset())

// Set up selection hover tools
let floatingTool = document.importNode(document.querySelector('template').content, true).childNodes[0];
let htmlOutputView = document.getElementById('html-output-view');
var lastValidSelection = ""
htmlOutputView.onpointerup = () => {
  let selection = document.getSelection(), text = selection.toString();
  lastValidSelection = text;
  if (text !== "") {
    let rect = selection.getRangeAt(0).getBoundingClientRect();
    console.dir(rect);
    floatingTool.style.top = `calc(${rect.top}px - 2rem)`;
    floatingTool.style.left = `calc(${rect.left}px + calc(${rect.width}px / 2) - 2.5rem)`;
    floatingTool['text']= text; 
    document.body.appendChild(floatingTool);
  }
}
 // set up event listeners
 let replaceAll = floatingTool.querySelector('#flt-btn-replace-all');
 replaceAll.addEventListener('click', (evt) => {
    console.dir(document.getSelection())
     substitutionVM.addReplacement(lastValidSelection, "replacement value")
     focusLastReplacementInput();
 }, false);

 // helper to focus last selection
 function focusLastReplacementInput(){
    clearFloater();
    let replacementArea = document.getElementById('replacement-area-root');
    let allReplacements = [...replacementArea.querySelectorAll('input.input-replacement-value')]
    if (allReplacements.length > 0){
        let targetNode = allReplacements[allReplacements.length - 1]
        targetNode.focus()
        targetNode.setSelectionRange(0, targetNode.value.length)
    }
 }

 // close listener
document.onpointerdown = (evt) => {
    if (evt.target === document.querySelector('#flt-btn-replace-all')){
        return;
    }
    clearFloater();
}

function clearFloater(){
    let floatingTool = document.getElementById('floatingTool');
    if (floatingTool){
        floatingTool.remove();
        document.getSelection().removeAllRanges();
    }

}

substitutionVM.populateFromBrowser();
fileVM.substitutions = substitutionVM.liveCopy;