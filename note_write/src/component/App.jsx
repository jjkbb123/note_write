import React, { Component } from "react";
import "./index.less";
import { Row, Col, Modal, Button, Input, Form } from "antd";
import BraftEditor from "braft-editor";
import "braft-editor/dist/index.css";
import Navigator from "./navgitor";
import ExportText from "./exportText";
import NoteCategory from "./noteCategory";
import NoteCategoryDrawer from "./noteCategoryDrawer";
import { storageGet, storageSet } from "utils/storage";

export default class App extends Component {
  state = {
    keyCode: [],
    noteVisble: false,
    categoryVisble: false,
    editorState: BraftEditor.createEditorState(null),
    note: {},
    currentKey: 0,
    editeKey: 0,
    noteNavigatorList: [],
    navigatorVisble: false,
    drawerVisible: false,
    currentCategory: "",
  };

  writeNoteRef = React.createRef();
  appRef = React.createRef();
  // noteCategoryBtnRef = React.createRef();
  formRef = React.createRef();
  componentDidMount() {
    this.hundleDocumentAddEventListener();
    this.renderNote(localStorage.getItem("currentTitle"));
    this.renderNavigator(localStorage.getItem("currentTitle"));
    this.contentScrollToHistoryVisit();
  }

  contentScrollToHistoryVisit = () => {
    setTimeout(() => {
      this.appRef.current.scrollTo(0, Number(localStorage.getItem("scroll")));
    });
  };

  openNoteCategoryDrawer = () => {
    const { drawerVisible } = this.state;
    this.setState({
      drawerVisible: !drawerVisible,
    });
  };

  // utils
  renderNavigator = (title) => {
    const initNote = JSON.parse(storageGet("note") || "[]");
    const note = title
      ? initNote.find((item) => item.title === title)?.content
      : initNote.find((item) => item.visible)?.content;
    let reg = /<h3(.*)><strong>(.*)<\/strong><\/h3>/gi;
    const noteNavigatorList = [];
    note?.forEach((item) => {
      const resultList = item.noteContent?.match(reg);
      Array.isArray(resultList) &&
        resultList.forEach((item) => {
          const result = /<h3(.*)><strong>(.*)<\/strong><\/h3>/gi.exec(item);
          noteNavigatorList.push(result && result[2]);
        });
    });
    this.setState({
      noteNavigatorList,
    });
  };

  // 选择篇目
  selectCategory = (title) => {
    this.renderNote(title);
    this.openNoteCategoryDrawer();
    this.renderNavigator(title);
    this.setState({
      currentCategory: title,
    });
  };

  renderNote = (title) => {
    const initNote = JSON.parse(storageGet("note") || "[]");
    const note = title
      ? initNote.find((item) => item.title === title)
      : initNote.find((item) => item.visible);
    this.setState({
      note,
      currentCategory: note?.title,
    });
  };

  deleteCurrntNoteContent = (key) => {
    const { currentCategory } = this.state;
    let currentContentIndex;
    const currentNoteContent = JSON.parse(storageGet("note") || "[]").find(
      (item, index) => {
        currentContentIndex = index;
        return item.title === currentCategory;
      }
    )?.content;
    const note = JSON.parse(storageGet("note") || "[]");
    const filterNote = currentNoteContent.filter((item) => item.key !== key);
    note.splice(currentContentIndex, 1, {
      title: currentCategory,
      content: filterNote,
    });
    storageSet("note", JSON.stringify(note));
    this.setState({
      note: {
        title: currentCategory,
        content: filterNote,
      },
    });
  };

  editeCurrentContentKey = (key) => {
    const { currentCategory } = this.state;
    const currentContent = JSON.parse(storageGet("note") || "[]")
      .find((item) => item.title === currentCategory)
      ?.content.find((item) => item.key === key);
    this.hundleModal();
    this.setState({
      editorState: BraftEditor.createEditorState(currentContent?.noteContent),
      editeKey: key,
    });
  };

  hundleDocumentAddEventListener = () => {
    document.body.addEventListener("keyup", this.writeNote);
    document.body.addEventListener("keydown", this.writeNote);
  };

  submitContent = () => {
    const { noteVisble, editeKey, currentCategory } = this.state;
    const htmlContent = this.state.editorState.toHTML();
    let currentContentIndex;
    const currentnote = JSON.parse(storageGet("note") || "[]").find(
      (item, index) => {
        currentContentIndex = index;
        return item.title === currentCategory;
      }
    );
    const { content: currentContent } = currentnote;
    const note = JSON.parse(storageGet("note") || "[]");
    if (editeKey) {
      const currentEditeContent = currentContent.findIndex(
        (item) => item.key === editeKey
      );
      currentContent[currentEditeContent].noteContent = htmlContent;
    } else {
      currentContent.push({
        noteContent: htmlContent,
        key: Date.now(),
      });
    }
    !isNaN(currentContentIndex) &&
      note.splice(currentContentIndex, 1, currentnote);
    this.setState({ note: currentnote });
    storageSet("note", JSON.stringify(note));
    this.renderNavigator(currentCategory);
    this.setState({
      noteVisble: !noteVisble,
      editeKey: 0,
    });
  };

  hundlePageCoordinate = (e) => {
    const appHieght = this.appRef.current?.clientHeight;
    const currentPointeY = e.pageY;
    if (appHieght - currentPointeY < 100) {
      this.setState({
        navigatorVisble: true,
      });
    } else {
      this.setState({
        navigatorVisble: false,
      });
    }
  };

  hundleCataegoryModal = (type) => {
    const { categoryVisble, currentCategory } = this.state;
    const note = JSON.parse(storageGet("note") || "[]");
    const { getFieldValue, validateFields } = this.formRef?.current || {};
    if (type === "ok") {
      validateFields(["category"]).then((val) => {
        note.push({
          title: getFieldValue("category"),
          visible: true,
          content: [],
        });
        storageSet("note", JSON.stringify(note));
        this.setState({
          categoryVisble: !categoryVisble,
          currentCategory: currentCategory
            ? currentCategory
            : getFieldValue("category"),
        });
      });
    } else {
      this.setState({
        categoryVisble: !categoryVisble,
      });
    }
  };

  // 光标自动聚焦
  setEditeRange = () => {
    setTimeout(() => {
      const editeDom =
        this.writeNoteRef.containerNode.children[1].children[0].children[0]
          .children[0];
      const domList = [...editeDom.children[0].childNodes];
      const rangeDom = domList[domList.length - 1];
      const sel = window.getSelection();
      editeDom.focus();
      function getLastChild(domChild) {
        if (
          domChild?.childNodes &&
          domChild.childNodes[0]?.nodeName !== "#text" &&
          [...domChild.childNodes].length
        ) {
          return getLastChild(domChild.childNodes[0]);
        } else {
          return domChild;
        }
      }
      sel.extend(getLastChild(rangeDom), 1);
      sel.collapseToEnd();
    });
  };

  hundleModal = (type) => {
    const { noteVisble } = this.state;
    this.setState({
      noteVisble: !noteVisble,
    });
    if (noteVisble && type === "ok") {
      this.submitContent();
    }
    if (noteVisble) {
      this.setState({
        editeKey: 0,
      });
    }
    this.setEditeRange();
  };

  handleEditorChange = (editorState) => {
    this.setState({ editorState });
  };

  isCurrentBody = (key) => this.state.currentKey === key;

  setNoteCategory = (e) => {
    const { keyCode } = e;
    if (keyCode === 13) {
      this.hundleCataegoryModal("ok");
    }
  };

  writeNote = (e) => {
    const { key, type } = e;
    const { keyCode } = this.state;
    keyCode.push(key);
    if (type === "keydown") {
      if (/alt/i.test(keyCode[0]) && /^w$/i.test(keyCode[1])) {
        if (
          !storageGet("note") ||
          !JSON.parse(storageGet("note") || "[]").find((item) => item.visible)
        ) {
          this.setState({
            categoryVisble: true,
            keyCode: [],
          });
          return;
        }
        this.setState({
          noteVisble: true,
        });
        this.setEditeRange();
      }
    } else if (/alt/i.test(keyCode[0]) && /^a$/i.test(keyCode[1])) {
      this.setState(
        {
          categoryVisble: true,
        },
        () =>
          this.setState({
            keyCode: [],
          })
      );
    } else {
      this.setState({
        keyCode: [],
      });
    }
  };

  render() {
    const {
      noteVisble,
      editorState,
      note,
      currentKey,
      noteNavigatorList,
      navigatorVisble,
      drawerVisible,
      categoryVisble,
      currentCategory,
    } = this.state;
    const controls = [
      "font-size",
      "text-color",
      "bold",
      "headings",
      "code",
      "text-indent",
    ];
    return (
      <div
        className="app"
        ref={this.appRef}
        onMouseMove={this.hundlePageCoordinate}
        onMouseLeave={() => this.setState({ navigatorVisble: false })}
        onScroll={(e) => localStorage.setItem("scroll", e.target.scrollTop)}
      >
        <div
          style={{
            position: "fixed",
            width: "inherit",
            marginLeft: -16,
            textAlign: "center",
            zIndex: 1,
          }}
        >
          <ExportText />
          <NoteCategory openNoteCategoryDrawer={this.openNoteCategoryDrawer} />
        </div>
        <NoteCategoryDrawer
          visible={drawerVisible}
          openNoteCategoryDrawer={this.openNoteCategoryDrawer}
          selectCategory={this.selectCategory}
        />
        <Modal
          title="添加篇目"
          onOk={() => this.hundleCataegoryModal("ok")}
          onCancel={this.hundleCataegoryModal}
          visible={categoryVisble}
        >
          <Form ref={this.formRef}>
            <Form.Item
              name="category"
              rules={[
                {
                  required: true,
                },
              ]}
            >
              <Input
                placeholder="输入要添加的篇目"
                onKeyUp={this.setNoteCategory}
              />
            </Form.Item>
          </Form>
        </Modal>
        <Modal
          title={currentCategory}
          visible={noteVisble}
          onOk={() => this.hundleModal("ok")}
          onCancel={this.hundleModal}
        >
          <BraftEditor
            controls={controls}
            value={editorState}
            onChange={this.handleEditorChange}
            onSave={this.submitContent}
            ref={(ref) => (this.writeNoteRef = ref)}
          />
        </Modal>
        <div style={{ marginTop: 70 }}>
          <div
            style={{
              textAlign: "center",
              fontSize: "xx-large",
              fontFamily: "cursive",
              color: "#f52f26",
            }}
          >
            {currentCategory}
          </div>
          {note?.content &&
            note.content.map((item) => (
              <div
                onMouseEnter={() => this.setState({ currentKey: item?.key })}
                onMouseLeave={() => this.setState({ currentKey: 0 })}
                key={item?.key}
              >
                <Row>
                  <Col span={20}>
                    <div
                      dangerouslySetInnerHTML={{ __html: item?.noteContent }}
                      style={Object.assign(
                        {
                          wordBreak: "break-all",
                          minHeight: 40,
                          border: "1px solid transparent",
                          paddingLeft: 6,
                        },
                        this.isCurrentBody(item?.key)
                          ? { background: "#fff", borderColor: "#d67f5c" }
                          : { borderColor: "transparent" }
                      )}
                      onDoubleClick={() =>
                        this.editeCurrentContentKey(item?.key)
                      }
                    />
                  </Col>
                  <Col span={4}>
                    {currentKey === item?.key ? (
                      <>
                        <Button
                          danger
                          onDoubleClick={() =>
                            this.deleteCurrntNoteContent(item?.key)
                          }
                          style={{ marginBottom: 5 }}
                        >
                          删除
                        </Button>
                      </>
                    ) : (
                      ""
                    )}
                  </Col>
                </Row>
              </div>
            ))}
        </div>
        <Navigator
          navigatorVisble={navigatorVisble}
          noteNavigatorList={noteNavigatorList}
          appRef={this.appRef}
        />
      </div>
    );
  }
}
