import styles from "../css/app.module.scss";
import React from "react";
import getRecommendations from "../services/dynamicRecommendationsService";
import { GetRecommendationsInput, GetRecommendationsResponse } from "../types/spotify-web-api.d";
import getID from './../services/common';
import RecommendedTrack from "./RecommendedTrack";
import { RecommendationsRender } from "../services/enhancifyInternalService";

class DynamicRecommendations extends React.Component<{recTargetProp : string}, {songQueue: Array<string>, artistQueue: Array<string>, recTarget: string, recommendations: GetRecommendationsResponse | {}}> {
  
  state = {
    songQueue: Spicetify.LocalStorage.get("songQueue")?.split(',') || new Array<string>,     // Song in the queue
    artistQueue: Spicetify.LocalStorage.get("artistQueue")?.split(',') || new Array<string>, // Artists in the queue
    recTarget: this.props.recTargetProp,                                                     // Get recommendations based 
                                                                                             // on songs or artists queue
    recommendations: {},                                                                     // Recommendations list
  }

  componentDidMount = () => {
    this.generateRecommendations();
  }

  // Generate recommendations by sending a request to the spotify API
  generateRecommendations = async () => {

    // Prepare the recommendations to send to the server
    let apiOptions = new GetRecommendationsInput();
    if (this.state.recTarget == "songs") {
      apiOptions.data.seed_tracks = this.state.songQueue.toString();
    }
    else if (this.state.recTarget == "artists") {
      apiOptions.data.seed_artists = this.state.artistQueue.toString(); 
    }
    
    // Make the API call
    var recommendations = await getRecommendations(apiOptions);
    this.setState({
      recommendations: recommendations,
    });
  };
  
  // Add the current song and artist to the queue when the song is played half-way through
  addToQueue = (event?: Event & {data: number}) => {
    if (!event || !Spicetify.Player.data) {
      return;
    }

    let progressPercentage = (event.data / Spicetify.Player.data.item.duration.milliseconds) * 100;
    if (progressPercentage < 50) {
      return;
    }

    // Update the song and artist queue
    this.setSongQueue();
    this.setArtistQueue();
  };

  // Add songs to the song queue
  setSongQueue = () => {
    let curSongID = getID(Spicetify.Player.data.item.uri);
    if (this.state.songQueue && this.state.songQueue[this.state.songQueue.length-1] == curSongID) {
      return;
    }

    let newQueue = this.state.songQueue.slice();
    if (newQueue.includes(curSongID)) {
      newQueue = newQueue.filter((val, ind) => val != curSongID);
    }

    newQueue.push(curSongID);
    if (newQueue.length > 5) {
      newQueue.shift();
    }

    this.setState({
      songQueue: newQueue,
    }, () => {
      if (Spicetify.LocalStorage.get("songQueue") == this.state.songQueue.toString()) {
        return;
      }
      Spicetify.LocalStorage.set("songQueue", this.state.songQueue.toString());
      if (this.state.recTarget == "songs") {
        this.generateRecommendations();
      }
    });
  };

  
  shouldArtistQueueBeUpdated = (): boolean => {
    if (!Spicetify.Player.data.item.artists) {
      return false;
    }
    if (!this.state.artistQueue) {
      return true;
    }

    for (const artist of Spicetify.Player.data.item.artists) {
      let fromIndex = Math.max(0, this.state.artistQueue.length - Spicetify.Player.data.item.artists.length);
      if (!this.state.artistQueue.includes(getID(artist.uri), fromIndex)) {
        return true;
      };
    }

    return false;
  };

  // Add artists to the queue
  setArtistQueue = () => {
    if (!Spicetify.Player.data.item.artists || !this.shouldArtistQueueBeUpdated()) {
      return;
    }

    let newArtistQueue = this.state.artistQueue.slice();
    for (const artist of Spicetify.Player.data.item.artists) {
      let artistID = getID(artist.uri);
      if (newArtistQueue.includes(artistID)) {
        newArtistQueue = newArtistQueue.filter((val, ind) => val != artistID);
      }
      newArtistQueue.push(artistID);
    }

    while (newArtistQueue.length > 5) {
      newArtistQueue.shift();
    }

    this.setState({
      artistQueue: newArtistQueue,
    }, () => {
      if (Spicetify.LocalStorage.get("artistQueue") == this.state.artistQueue.toString()) {
        return;
      }
      Spicetify.LocalStorage.set("artistQueue", this.state.artistQueue.toString());
      if (this.state.recTarget == "artists") {
        this.generateRecommendations();
      }
    });
  };

  componentDidUpdate(prevProps: Readonly<{ recTargetProp: string; }>, 
                     prevState: Readonly<{ songQueue: Array<string>; artistQueue: Array<string>; recTarget: string; recommendations: GetRecommendationsResponse | {}; }>, snapshot?: any): void {
    if (prevProps.recTargetProp != this.props.recTargetProp) {
      this.generateRecommendations();
    }
  }

  render() {
    Spicetify.Player.addEventListener("onprogress", this.addToQueue);
    return (
      <div className={styles.recommendationsSection} style={{width: "100%", paddingRight: "35px"}}>
        <div className={styles.recommendationHeader}>
          <div className={styles.recommendationsLabel} style={{marginTop: "10px"}}>{"Song Recommendations"}</div>
          <div className={styles.recommendationsHeaderSpacer}></div>
          <div className={styles.recommendationTarget}>{this.props.recTargetProp}</div>
        </div>
        <div className={styles.recommendationsBlock}>
          {RecommendationsRender(this.state.recommendations)}
        </div>
      </div>
    );
  }
}

export default DynamicRecommendations
