import React from "react";
import { TouchableOpacity,Text, StyleSheet,Dimensions,View } from "react-native";
import Icon from 'react-native-vector-icons/FontAwesome5'
import auth from '@react-native-firebase/auth'


const Message=({item,index})=>{
  const user = auth().currentUser;
  const userId = user.uid;
    return (<View style={(userId!=item.userId)?style.other:style.me}>
       <View style={[style.bubble,{borderTopRightRadius:(userId==item.userId)?0:15,borderTopLeftRadius:(userId==item.userId)?15:0, backgroundColor:(userId==item.userId)?'#FF8400':'#ddd'}]}> 
        <Text style={{color:(userId==item.userId)?'white':'#575757', fontSize:15, marginBottom:8}}>{item.text}</Text>
        <Text style={{color:(userId==item.userId)?'white':'#575757', textAlign:(userId==item.userId)?'right':'left', fontSize:11}}>{item.userName}</Text>
        </View>
        </View>)
}

const style=StyleSheet.create({
  other:{
    flexDirection:'row',
    flex:1,
    justifyContent:'flex-start'
  },
  me:{ flexDirection:'row',
    flex:1,
    justifyContent:'flex-end'
},
  bubble:{
padding:10,
backgroundColor:'#ddd',
maxWidth:Dimensions.get('window').width*0.7,
marginBottom:10,
borderRadius:15,
margin:10

    }
})

export default Message;