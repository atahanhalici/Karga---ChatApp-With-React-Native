import React, {Component} from 'react';
import {View, Text, StyleSheet,TextInput,FlatList,SafeAreaView} from 'react-native';
import Message from '../../Components/Rooms/Message';
import io from 'socket.io-client';
import Icon from 'react-native-vector-icons/FontAwesome5'
import { TouchableOpacity } from 'react-native-gesture-handler';
import auth from '@react-native-firebase/auth'
import firebase from '@react-native-firebase/app'

const connectionConfig={
    jsonp:false,
    reconnection:true,
    reconnectionDelay:100,
    reconnectionAttempts:1000,
    transports:['websocket']
}

var socket=io("http://192.168.0.23:3000",connectionConfig);
class Chat extends Component {
    constructor(props) {
        super(props);
        this.state={
            messages:[],
            text:[],
            connectedUserCount:0
        }
    }
    state = {  }

renderItem=({item,index})=>{
    return <Message item={item} index={index}></Message>
}

componentDidMount(){
    const { roomId,name } = this.props.route.params;
    console.log(name)
    this.props.navigation.setOptions({
        title: name,
      })
    socket.emit('connection-room',{roomId});
    socket.on('connection-room-view',(data)=>{
this.setState({
    connectedUserCount:data.count
})
    })
    firebase.app().database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/')
            .ref(`messages/${roomId}`)
            .on('value',snapshot=>
             {
                var messages=[];
snapshot.forEach((item) => {

    messages.push({
        roomId:item.val().roomId,
        text:item.val().text,
        userName:item.val().userName,
        userId:item.val().userId,
        id:item.key
    })
});

    this.setState({messages})
  
  });

}

componentWillUnmount(){
    const { roomId } = this.props.route.params;
    console.log("room"+roomId);
    socket.emit('leave-room',{roomId:roomId})
}

handleSend =()=>{
const {text}=this.state;
const { roomId } = this.props.route.params;

console.log(roomId);
const user = auth().currentUser;

           
                const userId = user.uid;
                const userName = user.displayName;

const newReference = firebase.app().database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/').ref(`messages/${roomId}`).push();

newReference.set({
    roomId,
    text:text,
    userId: userId,
    userName: userName,
}).then(() => {
   this.setState({text:''})
}).catch((error) => {
    alert("Error! Failed to Establish Room");
    console.error("Error creating chat room:", error);
});

}
    render() { 
        const{text,messages,connectedUserCount}=this.state;
        return ( <SafeAreaView style={{flex:1}}>
            <View style={{padding:10 , backgroundColor:'#ddd', alignItems:'center',justifyContent:'center'}}>
                <Text >Connected Users: {connectedUserCount}</Text>
            </View>
            <FlatList inverted ref={(ref)=> this.flatListRef=ref} data={messages.reverse()} style={style.flatlist} renderItem={this.renderItem}></FlatList>
                <View style={style.inputArea} >
                    <View style={{alignItems:'center', flexDirection:'row'}}><TextInput value={text} onChangeText={(text)=>this.setState({text})} style={style.input} placeholder='Write message..'></TextInput><TouchableOpacity onPress={this.handleSend}><Icon name={"paper-plane"} size={25}></Icon></TouchableOpacity></View>
                    
                    </View>
                    
        </SafeAreaView> );
    }
}

const style=StyleSheet.create({
flatlist:{flex:1,padding:10},
inputArea:{flexDirection:'column', justifyContent:'flex-end',padding:15,},
input:{ 
    height:40,paddingHorizontal:20, color:'black',borderWidth:1,borderColor:'#FF8400', flex:1, marginRight:10
}
})
 
export default Chat;