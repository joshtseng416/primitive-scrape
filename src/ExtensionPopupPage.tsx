import React from 'react';
import {
  ParseMessage,
  ParseResponse,
  ParseSucceededMessage,
  ScrapeMessage,
  TYPE_PARSE, TYPE_PARSE_SUCCEEDED,
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


interface ExtensionPopupPageState {
  parsedFields: string[]
}

export default class ExtensionPopupPage extends React.Component<any, ExtensionPopupPageState> {

  constructor(props: any) {
    super(props);
    this.state = {
      parsedFields: []
    }
  }

  componentDidMount() {
    chrome.runtime.onMessage.addListener(this.listenForParsedFields);
  }


  listenForParsedFields = (request: ParseSucceededMessage, sender: chrome.runtime.MessageSender, responseFunc: (response: any) => void) => {
    console.log("Popup received message:", request)
    if(request.type === TYPE_PARSE_SUCCEEDED) {
      console.log("Popup received success message:", request.parsedFields)
      request.parsedFields.forEach((entry) => {
        console.log("Entry:",entry)
      })
      this.setState({
        parsedFields: request.parsedFields
      })
    }
    responseFunc({});
    return true;
  }

  sendScrapeMessage = () => {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if(tabs[0].id != null) {
        const id = tabs[0].id;
        chrome.scripting.executeScript({
          target: {tabId: id, allFrames: false},
          files: ['content.js'],
        }, (results) => {
          chrome.tabs.sendMessage<ScrapeMessage>(id, {
            type: TYPE_SCRAPE
          });
        });
      }
    });
  }

  render() {
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

          <ChangeContextComponent
              sx={{
                position: "absolute",
                ...CHANGE_CONTEXT_POSITION,
              }}
          />

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

          {this.state.parsedFields.length > 0 &&
              (<h1>Address: {this.state.parsedFields[0]}</h1>)
          }
        </Box>
    );
  }
}
