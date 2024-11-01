import React from "react"; 
import styles from "./../css/app.module.scss";
import { GetRecommendationsInput, GetRecommendationsResponse, RecommendationsInput } from "../types/spotify-web-api.d";
import getRecommendations from "../services/dynamicRecommendationsService";
import { SelectedMetrics } from "../types/enhancify";
import getID from './../services/common';
import { RecommendationsRender } from "../services/enhancifyInternalService";

class RecommendationsModal extends React.Component<{setModalIsOpen: (value: boolean) => void, 
                                                    songURI: string, 
                                                    selectedMetrics: SelectedMetrics}, 
                                                   {recommendations: GetRecommendationsResponse | {}}> {

  state = {
    recommendations: {} // Recommendations that show up in the modal view
  };

  componentDidMount = () => {
    this.generateRecommendations();
  }

  // Generate recommendations by sending a request to the spotify API
  generateRecommendations = async () => {

    // Prepare the recommendations to send to the server
    let apiOptions = new GetRecommendationsInput();
    apiOptions.data.seed_tracks = getID(this.props.songURI);
    apiOptions.data.limit = "8";

    for (let key in this.props.selectedMetrics) {
      let apiDataKey = "target_" + key.toLowerCase();
      apiOptions.data[apiDataKey as keyof RecommendationsInput] = this.props.selectedMetrics[key];
    }
    
    // Make the API call
    var recommendations = await getRecommendations(apiOptions);
    this.setState({
      recommendations: recommendations,
    });
  };

  render() {
    return (
      <div className={styles.recommendationsModalContainer} style={{overflowY: "scroll", height: "550px"}}>
        <div className={styles.modalHeaderContainer} style={{marginBottom: "10px"}}>
            <div className={styles.recommendationsLabel} style={{marginBottom: "0px"}}>
                {"More Recommendations"}
            </div>
            <img className={styles.playIcon} style={{marginLeft: "auto"}} src={"https://img.icons8.com/?size=100&id=6483&format=png&color=FFFFFF"} 
                  onClick={() => this.props.setModalIsOpen(false)}/>
        </div>
        <div className={styles.settingContainer} style={{paddingLeft: "0", marginBottom: "20px"}}>
          {Object.keys(this.props.selectedMetrics).map((metric_name) => <div className={styles.recommendationTarget} style={{marginRight: "10px",
                                                                                                                           }}>
                                                                          {metric_name}
                                                                        </div>)}
        </div>
        <div className={styles.metricsRecommendationContainer}>
          {RecommendationsRender(this.state.recommendations)}
        </div>
      </div>
    );
  }
}

export default RecommendationsModal;
