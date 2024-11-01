import styles from "../css/app.module.scss";
import React from "react";
import getAudioFeatures from "../services/nowPlayingService";
import { AudioFeaturesResponse } from "../types/spotify-web-api";
import DynamicRecommendations from "./DynamicRecommendations";
import SongMetric from "./SongMetric";
import { SelectedMetrics, SongMetricData } from "../types/enhancify";
import { allMetrics, getSongMetrics } from "../services/enhancifyInternalService";
import RecommendationsModal from "./RecommendationsModal";
import SettingsModal from "./SettingsModal";
import Modal from 'react-modal';

class NowPlaying extends React.Component<{}, {audioFeatures: AudioFeaturesResponse | {}, 
                                              songURI: string, 
                                              recTarget: string,
                                              songMetrics: SongMetricData[],
                                              metricsToDisplay: string[],
                                              modalIsOpen: boolean,
                                              settingsModalIsOpen: boolean,
                                              selectedMetrics: SelectedMetrics}> {
  
  state = {
    audioFeatures:        {},      // Features of the currently playing song (name, artist, stats)
    songURI:              "",      // URI of the currently playing song
    recTarget:            "songs", // Recommendations based on either songs or artist
    songMetrics:          [],      // Current song metric information
    metricsToDisplay:     Spicetify.LocalStorage.get("metricsToDisplay") != "" ? 
                          Spicetify.LocalStorage.get("metricsToDisplay")?.split(',') || 
                          ["Danceability", "Energy", "Acousticness", "Loudness", "Key", "Tempo"] : 
                          [],     // Current metric information types
    modalIsOpen:         false,   // Whether the modal is currently open
    settingsModalIsOpen: false,   
    selectedMetrics:     JSON.parse(Spicetify.LocalStorage.get("selectedMetrics") || 
                         "{}"), // Metrics that have been selected to be fed into the Spotify recommendations endpoint
  }

  componentDidMount = () => {
    this.setAudioFeatures();
  }
  
  setAudioFeatures = () => {
    // Check if there is no currently playing song or 
    // if the info of the song is currently being displayed
    if (!Spicetify.Player.data || this.state.songURI == Spicetify.Player.data.item.uri) {
      return;
    }

    this.state.songURI = Spicetify.Player.data.item.uri;

    // API call for getting song info
    const apiCall = async () => {
      const currentAudioFeatures = await getAudioFeatures(this.state.songURI || "");
      this.setState({
        audioFeatures: currentAudioFeatures,
      }, this.setSongMetrics);
    }

    // Make the API call
    apiCall();
  }

  // Sets the song metric information based on the type of information that the user wants to be displayed
  setSongMetrics = () => {
    this.setState({
      songMetrics: getSongMetrics((this.state.audioFeatures as AudioFeaturesResponse), this.state.metricsToDisplay)
    });
  }

  // Change the recommendation target
  changeRecTarget = () => {
    if (this.state.recTarget == "songs") {
      this.setState({
        recTarget: "artists",
      });
    }
    else if (this.state.recTarget == "artists") {
      this.setState({
        recTarget: "songs",
      });
    }
  };

  // Toggles whether the metric that the user clicked on should be displayed or not
  toggleMetric = (metric: string) => {
    let newArray = this.state.metricsToDisplay.slice();
    if (newArray.includes(metric)) {
      newArray = newArray.filter((val) => val != metric);

      // If a metric is being hidden from the display, it should not be fed into the recommendations endpoint
      if (metric in this.state.selectedMetrics) {
        let copy: SelectedMetrics = { ...this.state.selectedMetrics };
        delete copy[metric];
        Spicetify.LocalStorage.set("selectedMetrics", JSON.stringify(copy));
        this.setState({
          selectedMetrics: copy
        });
      }
    }
    else {
      newArray.push(metric);
    }

    Spicetify.LocalStorage.set("metricsToDisplay", newArray.toString());

    this.setState({
      metricsToDisplay: newArray
    }, this.setSongMetrics);
  }

  // Set whether the modal should be open or closed
  setModalIsOpen = (value: boolean) => {
    this.setState({
      modalIsOpen: value
    });
  }

  setSettingsModalIsOpen = (value: boolean) => {
    this.setState({
      settingsModalIsOpen: value,
    });
  }

  // Select a metric to toggle whether they should be included in the recommendations endpoint request or not
  selectMetric = (metric: string, value: string) => {
    let copy: SelectedMetrics = { ...this.state.selectedMetrics };
    if (metric in copy) {
      delete copy[metric];
    }
    else {
      copy[metric] = value;
    }
    Spicetify.LocalStorage.set("selectedMetrics", JSON.stringify(copy));
    this.setState({
      selectedMetrics: copy
    });
  }

  modalStyles = {
    overlay: {
      backgroundColor: "rgba(0, 0, 0, 0.70)",
    },
    content: {
      position:  'absolute',
      top:       '40%',
      left:      '47%',
      transform: 'translate(-50%, -50%)',
      width:     "33%",
      height:    "65%",
    },
  }

  recommendationsModalStyles = {
    overlay: {
      backgroundColor: "rgba(0, 0, 0, 0.70)",
    },
    content: {
      position:  'absolute',
      top:       '43%',
      left:      '47%',
      transform: 'translate(-50%, -50%)',
      width:     "50%",
      height:    "600px"
    },
  }

  render() {

    Spicetify.Player.addEventListener("songchange", this.setAudioFeatures);

    return (
      <>
        <div className={styles.topBar}>
          <div className={styles.nowPlayingSidebar}>
            {Spicetify.Player.data ? 
              <div className={styles.trackInfoPrimary}>
                {/* Track cover */}
                {Spicetify.Player.data.item.images ? 
                  Spicetify.Player.data.item.images.length > 0 ? 
                    <img src={Spicetify.Player.data.item.images[0].url} className={styles.trackCover}/> 
                  : <></> 
                : <></>}

                {/* Track title */}
                <text className={styles.text} style={{marginTop:    "5px", 
                                                      fontSize:     "30px",
                                                      fontWeight:   "530",
                                                      textOverflow: "ellipsis",
                                                      overflow:     "hidden", 
                                                      whiteSpace:   "nowrap",
                                                      textAlign:    "center",
                                                      alignContent: "center",
                                                      width:        "250px",
                                                      color:        "white"}}>
                  {Spicetify.Player.data.item.name}
                </text>

                {/* Track artist(s) */}
                {(function () {

                  // Get all the artists
                  const trackArtists = Spicetify.Player.data.item.artists;
                  let trackAritistsInnnerHTML = "";

                  // Check if there are any artists
                  if (trackArtists) {
                    // Display all the artists
                    for (const artist of trackArtists) {
                      trackAritistsInnnerHTML += (artist.name + ", ")
                    }
                    if(trackAritistsInnnerHTML.length > 0) {
                      trackAritistsInnnerHTML = trackAritistsInnnerHTML.substring(0, trackAritistsInnnerHTML.length - 2);
                    }

                    return <text className={styles.text} style={{fontSize:    "15px", 
                                                                marginBottom: "2px",
                                                                textOverflow: "ellipsis",
                                                                width:        "250px",
                                                                textAlign:    "center",}}> 
                              {trackAritistsInnnerHTML} 
                            </text>
                  } else {
                    return <></>;
                  }
                })()}

                {/* Track album */}
                <text className={styles.text} style={{fontSize:     "15px", 
                                                      textOverflow: "ellipsis", 
                                                      width:        "250px",
                                                      textAlign:    "center",}}>
                  {Spicetify.Player.data.item.album.name}
                </text>
              </div>
            : <></>}
          </div>
            <DynamicRecommendations recTargetProp={this.state.recTarget}></DynamicRecommendations>
        </div>
        
        {/* Stats block */}
        <div className={styles.sectionHeaderContainer}>
          <div className={styles.recommendationsLabel} style={{marginLeft: "20px", marginBottom: "0px"}}>
            {"Song Statistics"}
          </div>
          <div className={styles.settingsIconContainer} style={{marginLeft: "auto", marginRight: "0px"}} onClick={() => this.setState({modalIsOpen: true})}>
              <img src={"https://img.icons8.com/?size=100&id=9403&format=png&color=FFFFFF"} 
                   style={{width: "25px", 
                           height: "25px", 
                           marginTop: "auto", 
                           marginBottom: "auto"}} />
          </div>
          <div className={styles.settingsIconContainer} onClick={() => this.setSettingsModalIsOpen(true)}>
              <img src={"https://img.icons8.com/?size=100&id=2969&format=png&color=FFFFFF"} 
                   style={{width: "25px", 
                           height: "25px", 
                           marginTop: "auto", 
                           marginBottom: "auto"}} />
          </div>
        </div>
        <div className={styles.statsBlock}>

          {/* Stats block data */}
          {this.state.songMetrics.map((songMetric: SongMetricData, i) => {
            return <SongMetric title={songMetric.title} 
                               floatValue={songMetric.floatValue} 
                               label={songMetric.label} 
                               progressBar={songMetric.progressBar} 
                               selectMetric={this.selectMetric} 
                               isMetricSelected={songMetric.title in this.state.selectedMetrics}/>;
          })}

        </div>
        <div>
        </div>
        <Modal className={styles.modal} isOpen={this.state.modalIsOpen} onRequestClose={() => this.setModalIsOpen(false)} style={this.recommendationsModalStyles}>
          <RecommendationsModal setModalIsOpen={this.setModalIsOpen} 
                                songURI={this.state.songURI} 
                                selectedMetrics={this.state.selectedMetrics}/>
        </Modal>
        <Modal className={styles.modal} isOpen={this.state.settingsModalIsOpen} onRequestClose={() => this.setSettingsModalIsOpen(false)} style={this.modalStyles}>
            <SettingsModal changeRecTarget={this.changeRecTarget} toggleMetric={this.toggleMetric} recTarget={this.state.recTarget} metricsToDisplay={this.state.metricsToDisplay} 
                            setModalIsOpen={this.setSettingsModalIsOpen}/>
        </Modal>
      </>
    );
  }
}

export default NowPlaying;