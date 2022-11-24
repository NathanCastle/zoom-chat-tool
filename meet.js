var fileContents = "";
var htmlOutput = null;

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

  reader = new FileReader();

  constructor(renderCallback) {
    this.renderCallback = renderCallback;
    this.reader.onload = (event) => {
      this.rawContents = event.target.result;
      this.filteredContents = `${this.rawContents}`;
      this.parseAndRender();
    };
  }

  parseAndRender() {
    this.parsedContents = this._convertToSchema(this.rawContents);
    this.mdForDisplay = this._convertSchemaToMarkdown(this.parsedContents);
    this.htmlForDisplay = this._convertSchemaToHtml(this.parsedContents);
    this.htmlForPrint = this.htmlForDisplay.cloneNode(true);
    this.renderCallback?.call();
  }

  _convertToSchema(inputText) {
    let lines = inputText.split("\n");

    let statements = [];
    var statementInProgress = null;

    let timeRegex = /^(([0-9]{2})\:){2}([0-9]{2})/g;

    for (var line of lines) {
      if (timeRegex.test(line)) {
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
      } else if (statementInProgress != null) {
        statementInProgress.contents = `${
          statementInProgress.contents
        }\n${line.trim()}`;
      }
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
        output = `${output}\n- [[${entry.from}]]: ${entry.contents.trim()}`;
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

function handleObsidianLinkChange(evt) {
  enableObsidianLinks = evt.checked;
  if (fileVM) {
    fileVM.useWikiLinksInMarkdown = evt.checked
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
    handleCopy(evt, fileVM.htmlForDisplay.innerHTML)
}
function handleCopyMd(evt){
    handleCopy(evt, fileVM.mdForDisplay)
}
async function handleCopy(evt, content) {
  if (navigator.clipboard) {
    try {
      const blob = new Blob([content], { type: "text/html" });
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": blob,
        }),
      ]);
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


document.getElementById("copy-btn-html").addEventListener("click", handleCopyHtml);
document.getElementById("copy-btn-md").addEventListener("click", handleCopyMd);