import { StyleSheet, View, Text, FlatList, Image } from 'react-native';
import { useState, useRef, useEffect } from 'react';
import 'react-native-get-random-values';

import * as Location from 'expo-location'
import MapView, {Marker, Callout} from 'react-native-maps';

import { doc, updateDoc, getDoc, collection, addDoc, setDoc } from 'firebase/firestore';
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
  
  const [selectedMarkerId, setSelectedMarkerId] = useState(null); 
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
    
      const markerId = uuidv4();

    const newMarker = {
      id: markerId,
      coordinate: {latitude, longitude},
      key: markerId,
      title: city || region || country || "Location",
      description: locationInfo,
      images: [],
    }
      
    setMarkers((prevMarker) => [...markers, newMarker])

    try {
      await setDoc(doc(database, "map", markerId), newMarker);
      console.log("Document written with ID: ", markerId);
    } catch (err) {
      console.error("Error adding document: ", err);
    }

  } else {
    console.log("No location details on this coordinate")
  }
  }

  
  async function onMarkerPressed(markerTitle, markerId){
    setSelectedMarkerId(markerId);
    // alert(`Marker pressed: ${markerTitle}`);
    try{
      const docRef = await addDoc(collection(database,"map"), {
        text: markerTitle,
        id: markerId
      });
      console.log("marker with id ", docRef.id)
     
    }catch(err){
      console.log("Error adding to DB " + err)
    }

    const markerRef = doc(database, "map", markerId);
    const markerDoc = await getDoc(markerRef);
    if (markerDoc.exists()) {
      const markerData = markerDoc.data();
      // Assuming images is an array of image URLs
      setImages(markerData.images || []);
    } else {
      console.log("No such marker!");
      setImages([]);
    }
  }

  async function launchImagePicker(markerId){
    let result = await ImagePicker.launchImageLibraryAsync({
      allowEditing: true
    })
    if(!result.canceled){
      
      uploadImage(result.assets[0].uri, markerId)
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
        uploadImage(response.assets[0].uri, selectedMarkerId)
      })
    }
  }

  async function uploadImage(imageUri, markerId){

    if (!markerId) {
      alert('No marker selected');
      return;
    }

    const imageId = uuidv4();
    try{
      const res = await fetch(imageUri)
      const blob = await res.blob()
      const storageRef = ref(storage, `images/${markerId}/${imageId}.jpg`)
      await uploadBytes(storageRef, blob);
      const imageUrl = await getDownloadURL(storageRef);
      addImageToMarker(imageId, imageUrl, selectedMarkerId);
      alert("ImageUploaded");

    }catch (err) {
      console.error("Error uploading image", err);
    }
  }

 async function addImageToMarker(imageId, imageUrl, markerId) {
  
    try {
      const mapRef = doc(database, "map", markerId);
      const updatedImages = [...images, { id: imageId, url: imageUrl }];
      await updateDoc(mapRef, { images: updatedImages }); // Firestore update
  
      setImages(updatedImages); // Local state update
    } catch (err) {
      console.error("Error adding image to note", err);
    }
  } 
  

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
        onPress={() => {onMarkerPressed(marker.title, marker.id)}}
        >
        
        <Callout onPress={()=> {launchImagePicker(marker.id)}}>
          <View>
            <Text>{marker.title}</Text>
            <Text style={{ color: '#8e0afa', paddingTop: 10 }}>add image</Text>
          </View>
        </Callout>
        </Marker>
      ))}

      </MapView>

      <View style={styles.imageContainer}>
        <FlatList  
          data = {images}
          horizontal={true}
          keyExtractor={(item) => item.id}  //Giver hver item i FlatList en unik key value.
          renderItem = {({item}) => (
            <View style={styles.imageDB}>
              
                <Image style={{width: 150, height: 150}} source={{uri:item.url}}/>
                         
            </View>
          )}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1
    // width: '100%',
    // height: '100%',
  },

  imageContainer: {
    height:100,
    flexDirection: 'row',
    justifyContent: "flex-end",
    alignItems: 'center',
    marginBottom: 10
  },
  imageDB: {
    marginRight: 10,
    // flexDirection: 'row',
    // justifyContent: 'flex-start',
    // alignItems: 'flex-start',
  },
});