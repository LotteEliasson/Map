import { StyleSheet, View } from 'react-native';
import { useState, useRef, useEffect } from 'react';

import * as Location from 'expo-location'
import MapView, {Marker} from 'react-native-maps';

import { doc, updateDoc, getDoc, collection, addDoc } from 'firebase/firestore';
import { app, database, storage } from './firebase';
import { useCollection } from 'react-firebase-hooks/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject} from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';

import * as ImagePicker from 'expo-image-picker';


export default function App() {
  
  const [ text, setText ] = useState('');
  const [images, setImages] = useState ([])
// Henter documents fra firebase, laver et object af hvert doc og tilføjer id som property.
  // const data = values?.docs.map((doc) => ({...doc.data(), id:doc.id}))
  
  const [markers, setMarkers] = useState([])
  const [region, setRegion] = useState({
    latitude:55,
    longitude:12,
    latitudeDelta:20,
    longitudeDelta:20
  })
// useRef holde en reference på tværs af rendering
  const mapView = useRef(null);
  const locationSubscription = useRef(null);

  useEffect (() =>{
    async function startListening(){
      let { status } = await Location.requestForegroundPermissionsAsync()
      if(status !== 'granted'){
        alert("ingen adgang til lokation")
        return
      }
      locationSubscription.current = await Location.watchPositionAsync({
        distanceInterval: 100,
        accuracy: Location.Accuracy.High

      }, (location) => {
        const newRegion = {
          latitude:location.coords.latitude,
          longitude:location.coords.longitude,
          latitudeDelta:20,
          longitudeDelta:20
        }
        setRegion(newRegion)
        if(mapView.current){
          mapView.current.animateToRegion(newRegion)
        }
      })
    }
    startListening()
    return ()=> {
      if(locationSubscription.current){
        locationSubscription.current.remove()
      }
    }
  }, [])



  function addMarker(data){
    const {latitude, longitude} = data.nativeEvent.coordinate
    const newMarker = {
      coordinate: {latitude, longitude},
      key: data.timeStamp,
      title: "Great Place"
    }
    setMarkers([...markers, newMarker])
  }

  
  async function onMarkerPressed(){
    alert("you pressed ")
    try{
      await addDoc(collection(database,"map", marker),{
        text: "Hej Lotte"
      })

    }catch(err){
      console.log("Error adding to DB " + err)
    }
  }

  async function launchImagePicker(){
    let result = await ImagePicker.launchImageLibraryAsync({
      allowEditing: true
    })
    if(!result.canceled){
      
      uploadImage(result.assets[0].uri)
    }
  }

  async function uploadImage(imageUri){
    const imageId = uuidv4();
    try{
      const res = await fetch(imageUri)
      const blob = await res.blob()
      const storageRef = ref(storage, `images/${details.id}/${imageId}.jpg`)
      await uploadBytes(storageRef, blob);
      const imageUrl = await getDownloadURL(storageRef);
      addImageToNote(imageId, imageUrl);
      alert("ImageUploaded");

    }catch (err) {
      console.error("Error uploading image", err);
    }
  }

  return (
    <View style={styles.container}>
      <MapView 
      style={styles.map}
      region={region}
      onLongPress={addMarker} >
      
      {markers.map(marker => (
        <Marker
        coordinate={marker.coordinate}
        key={marker.key}
        title={marker.title}
        onPress={() => {launchImagePicker(), onMarkerPressed(marker.title)}}
        />
      ))}

      </MapView>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width: '100%',
    height: '100%',
  },
});