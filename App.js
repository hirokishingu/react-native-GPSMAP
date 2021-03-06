import React from 'react';
import { StyleSheet, Text, View, Platform, TouchableOpacity } from 'react-native';
import {
  MapView,
  Permissions,
  Constants,
  Location,
  FileSystem,
  MailComposer,
} from 'expo'
import { 
  lineString
 } from '@turf/helpers'

export default class App extends React.Component {

  constructor(props) {
    super(props)
    this.state = {
      latitude: null,
      longitude: null,
      message: "位置情報取得中",
      logs: [],
      subscription: null,
      status: 'stop',
    }
  }

  componentDidMount() {
    if (Platform.OS === 'android' && !Constants.isDevice) {
      this.setState({
        message: 'Androidエミュレータでは動きません。実機で試してください。',
      })
    } else {
      this.getLocationAsync()
    }
  }

  getLocationAsync = async () => {
    const { status } = await Permissions.askAsync(Permissions.LOCATION);
    if (status !== 'granted') {
      this.setState({
        message: '位置情報のパーミッションの取得に失敗しました。',
      })
      return
    }
    const location = await Location.getCurrentPositionAsync({});
    this.setState({ latitude: location.coords.latitude, longitude: location.coords.longitude })
  }

  startLogging = async () => {
    if (this.state.subscription) {
      return 
    }
    this.setState({logs: []})
    const subscription = await Location.watchPositionAsync({enableHighAccuracy: true, distanceInterval: 5 }, this.loggingPosition)
    this.setState({ subscription: subscription, status: 'logging'})
  }

  stopLogging = () => {
    if (this.state.subscription) {
      this.state.subscription.remove(this.loggingPosition)
    }
    this.setState({ subscription: null, status: 'stop'})
  }

  loggingPosition = ({coords, timestamp}) => {
    if (coords.accuracy) {
      let logs = [...this.state.logs]
      logs.push({latitude: coords.latitude, longitude: coords.longitude})
      this.setState({logs: logs})
    }
  }

  sendEmail = async () => {
    if (this.state.status !== 'stop' || this.state.logs.length < 2) {
      return 
    }
    const logs = [...this.state.logs]
    const locations = logs.map(data => [data.longitude, data.latitude])
    const geojson = JSON.stringify(lineString(locations))
    const uri = FileSystem.cacheDirectory + 'gpslog.geojson'
    await FileSystem.writeAsStringAsync(uri, geojson)
    const status = await MailComposer.composeAsync({attachments: [uri]})
    if (status === 'sent') {
      console.warn('sent mail')
    }
  }

  render() {
    if (this.state.latitude && this.state.longitude) {
      return (
        <View style={styles.container}>
          <View style={styles.buttonContainer}>
            <TouchableOpacity onPress={this.startLogging}>
              <Text>Start</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={this.stopLogging}>
              <Text>Stop</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={this.sendEmail}>
              <Text>Email</Text>
            </TouchableOpacity>
          </View>
          <MapView
            style={{flex: 1}}
            initialRegion={{
              latitude: this.state.latitude,
              longitude: this.state.longitude,
              latitudeDelta: 0.00922,
              longitudeDelta: 0.00521,
            }}
            showsUserLocation={true}
          >
            {
              this.state.logs.length > 1 ?
                <MapView.Polyline
                  coordinates={this.state.logs}
                  strokeColor="#00008b"
                  strokeWidth={6}
                />
                : null
            }
          </MapView>
        </View>
      )
    }
    return (
      <View style={{flex: 1, justifyContent: 'center'}}>
        <Text>{this.state.message}</Text>
      </View>
    )
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'flex-start',
  },
  buttonContainer: {
    height: 100,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
});
