import React from 'react';
import {
  ParseSucceededMessage,
  ScrapeMessage,
  TYPE_PARSE_SUCCEEDED,
  TYPE_SCRAPE
} from "./chrome/MessagePassing";
import {Box, Button} from "@mui/material";
import CurrentContextViewerComponent from "./components/CurrentContextViewerComponent";
import {
    CHANGE_CONTEXT_POSITION,
    CURRENT_CONTEXT_VIEWER_POSITION,
    MAIN_BUTTON_POSITION,
    SETTINGS_POSITION, TEMPLATE_POSITION
} from "./components/PositionsAndDimensions";
import ChangeContextComponent from "./components/ChangeContextComponent";
import SettingsComponent from "./components/SettingsComponent";
import TemplateViewerComponent from "./components/TemplateViewerComponent";
import {ContextMap, ParsingContext} from "./parsing/ParsingContext";
import {
    ParsingTemplate,
    ParsingTemplateMap,
    STREET_EASY_BUILDING_EXPLORER_TEMPLATE_MAP
} from "./parsing/ParsingTemplate";
import {ParsedPage} from "./parsing/ParsedPage";
import ScrapedDataPreviewComponent from "./components/ScrapedDataPreviewComponent";
import {ParsedDataPreview} from "./parsing/ParsedDataPreview";
import { v4 as uuidv4 } from 'uuid';
import {newLocalStorage, StorageInterface} from "./chrome/ChromeStorage";
import {ParseSettings} from "./parsing/ParseSettings";

interface ExtensionPopupPageState {
    contexts: StorageInterface<ContextMap>
    currentContext: StorageInterface<ParsingContext | null>,

    templates: StorageInterface<ParsingTemplateMap>,
    currentTemplate: StorageInterface<ParsingTemplate>,

    previewingData: StorageInterface<ParsedDataPreview[] | null>,

    parseSettings: StorageInterface<ParseSettings>,
}

function loadStateFromStorage(state: {[key: string] : any}, key: string, func: (state: any) => void) {
    const constFunc = func;
    const value = state[key];
    if(value != null) {
        // @ts-ignore because this isn't type safe, but we know it is being used on storage interfaces in state
        value.load().then(value => {
            constFunc({
                [key]: value
            })
        });
    }
}

export default class ExtensionPopupPage extends React.Component<any, ExtensionPopupPageState> {

  constructor(props: any) {
    super(props);
    this.state = {
        contexts: newLocalStorage("contexts", {}),
        templates: newLocalStorage("templates", STREET_EASY_BUILDING_EXPLORER_TEMPLATE_MAP),

        currentContext: newLocalStorage("currentContext", null),
        currentTemplate: newLocalStorage("currentTemplate", STREET_EASY_BUILDING_EXPLORER_TEMPLATE_MAP["Building"]),

        previewingData: newLocalStorage("previewingData", null),

        parseSettings: newLocalStorage("parseSettings", {
            previewData: true,
            moveToContext: true
        }),
    }

    const setState = this.setState.bind(this)

    loadStateFromStorage(this.state, "contexts", setState);
    loadStateFromStorage(this.state, "templates", setState);
    loadStateFromStorage(this.state, "currentContext", setState);
    loadStateFromStorage(this.state, "currentTemplate", setState);
    loadStateFromStorage(this.state, "parseSettings", setState);
  }

  componentDidMount() {
    //chrome.runtime.onMessage.addListener(this.listenForParseResult);
  }

  // saveParsedData = (page: ParsedPage, context: ParsingContext | null) => {
  //
  //     if(this.state.moveToContext) {
  //         //TODO---Move to the new context
  //
  //         //TODO--Maybe also add to a list of recent contexts for viewing later
  //     }
  // }
  //
  // processParsedData = (page: ParsedPage, context: ParsingContext | null, template: ParsingTemplate) => {
  //     if(this.state.previewScrape) {
  //         this.setState({
  //             previewingData: {
  //                 page: page,
  //                 context: context,
  //             }
  //         })
  //     } else {
  //         //No data previewing, so we just save the data right away
  //         this.saveParsedData(page, context)
  //     }
  // }
  //
  // listenForParseResult = (request: ParseSucceededMessage, sender: chrome.runtime.MessageSender, responseFunc: (response: any) => void) => {
  //   console.log("Popup received message:", request)
  //   if(request.type === TYPE_PARSE_SUCCEEDED) {
  //       if(messageContext) {
  //           this.processParsedData(request.result, messageContext.context, messageContext.template)
  //       }
  //       this.state.scrapeMessageContexts.delete(request.uid);
  //   }
  //   responseFunc({});
  //   return true;
  // }

  sendScrapeMessage = () => {
        const uid = uuidv4();
        const messageContext = {
            template: this.state.currentTemplate.get(),
            context: this.state.currentContext.get(),
        }

        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
          if(tabs[0].id != null) {
            const id = tabs[0].id;
            chrome.scripting.executeScript({
              target: {tabId: id, allFrames: false},
              files: ['content.js'],
            }, (results) => {
              chrome.tabs.sendMessage<ScrapeMessage>(id, {
                  type: TYPE_SCRAPE,
                  uid: uid,
                  parentContextUid: messageContext.context == null ? null : messageContext.context.uid,
                  templateName: messageContext.template.name,
                  parseFields: messageContext.template.parsableFields,
              });
            });
          }
        });
  }

  render() {
    const previewData = this.state.previewingData;

      return (
        <Box sx={{
          height: "100%",
          width: "100%",

        }}>
          <CurrentContextViewerComponent
              sx={{
                position: "absolute",
                ...CURRENT_CONTEXT_VIEWER_POSITION,
              }}
          />

          {this.state.previewingData == null &&
              <ChangeContextComponent
                sx={{
                    position: "absolute",
                    ...CHANGE_CONTEXT_POSITION,
                }}
              />
          }

            {previewData != null &&
                <ScrapedDataPreviewComponent
                    sx={{
                        position: "absolute",
                        ...CHANGE_CONTEXT_POSITION,
                    }}
                    // @ts-ignore because we check for not null in the TSX block right above
                    previewData={previewData}
                />
            }
          <SettingsComponent
              sx={{
                position: "absolute",
                ...SETTINGS_POSITION
              }}
          />

          <TemplateViewerComponent
            sx={{
                position: "absolute",
                ...TEMPLATE_POSITION,
            }}
            currentTemplate={this.state.currentTemplate.get()}
            templates={this.state.templates.get()}
            templateChangedFunc={(template) => {
                this.setState(oldState => {
                    return {
                        currentTemplate: oldState.currentTemplate.update(template)
                    }
                })
            }}
          />

          <Button
              sx={{
                position: "absolute",
                ...MAIN_BUTTON_POSITION,
              }}
              variant="contained"
              onClick={this.sendScrapeMessage}>
            Scrape this page
          </Button>
        </Box>
    );
  }
}
