import { StyleSheet, View, TouchableOpacity, Text } from 'react-native';
import { useState, useRef, useEffect } from 'react';
import 'react-native-get-random-values';

import * as Location from 'expo-location'
import MapView, {Marker, Callout} from 'react-native-maps';

import { doc, updateDoc, getDoc, collection, addDoc } from 'firebase/firestore';
import { app, database, storage } from './firebase';
import { useCollection } from 'react-firebase-hooks/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject} from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';

import * as ImagePicker from 'expo-image-picker';


export default function App() {
 
  const [ text, setText ] = useState('');
  const [images, setImages] = useState ([])
  const [values, loading, error] = useCollection(collection(database, "map"));
// Henter documents fra firebase, laver et object af hvert doc og tilføjer id som property.
  const data = values?.docs.map((doc) => ({...doc.data(), id:doc.id}))
  
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



  async function addMarker(data){
    const {latitude, longitude} = data.nativeEvent.coordinate
    console.log(latitude + " " + longitude)

    let locationDetails = await Location.reverseGeocodeAsync({latitude,longitude})
    if(locationDetails && locationDetails.length>0){
      const { city, country, name, region, street } = locationDetails[0];
      const locationInfo = `Name: ${name}, City: ${city}, Region: ${region}, Country: ${country}, Street: ${street}`;
      console.log(locationInfo);
    

    const newMarker = {
      coordinate: {latitude, longitude},
      key: uuidv4(),
      title: city || region || country || "Location",
      description: locationInfo
    }
      
    setMarkers([...markers, newMarker])
  } else {
    console.log("No location details on this coordinate")
  }
  }

  
  async function onMarkerPressed(markerTitle){
    
    alert("you pressed ")
    try{
      const docRef = await addDoc(collection(database,"map"), {
        text: markerTitle,
        
      });
      console.log("marker with id ", docRef.id)
      return docRef.id  
    
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

  async function launchCamera(){
    const result = await ImagePicker.requestCameraPermissionsAsync()
    if(result.granted===false){
      console.log("Access to camera not allowed")
    }else {
      ImagePicker-ImagePicker.launchCameraAsync({
        quality:1
      })
      .then((response)=> {
        console.log("Image loaded" + response)
        // setImagePath(response.assets[0].uri)
        uploadImage(response.assets[0].uri)
      })
    }
  }

  async function uploadImage(imageUri){
    // if(!selectedMarkerId) {
    //   console.log("No marker selected for uploading image");
    //   return;
    // }

    const imageId = uuidv4();
    try{
      const res = await fetch(imageUri)
      const blob = await res.blob()
      const storageRef = ref(storage, `images/${imageId}.jpg`)
      await uploadBytes(storageRef, blob);
      const imageUrl = await getDownloadURL(storageRef);
      // addImageToLocation(imageId, imageUrl);
      alert("ImageUploaded");

    }catch (err) {
      console.error("Error uploading image", err);
    }
  }

  // async function addImageToLocation(imageId, imageUrl) {
  
  //   try {
  //     const mapRef = doc(database, "map");
  //     const updatedImages = [...images, { id: imageId, url: imageUrl }];
  //     await updateDoc(mapRef, { images: updatedImages }); // Firestore update
  
  //     setImages(updatedImages); // Local state update
  //   } catch (err) {
  //     console.error("Error adding image to note", err);
  //   }
  // }
  

  return (
    <View style={styles.container}>
      <MapView 
      style={styles.map}
      region={region}
      onLongPress={addMarker} >
      
      {markers.map ((marker) => (
        <Marker
        coordinate={marker.coordinate}
        key={marker.key}
        title={marker.title}
        onPress={() => onMarkerPressed(marker.title)}
        >
        
        <Callout onPress={launchImagePicker}>
      <View>
        <Text>{marker.title}</Text>
        <Text style={{ color: '#8e0afa', paddingTop: 10 }}>add image</Text>
      </View>
    </Callout>
        </Marker>
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