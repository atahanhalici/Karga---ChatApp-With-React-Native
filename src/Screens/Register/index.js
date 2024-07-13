import React from 'react'
import { Image, StyleSheet, View,SafeAreaView, TouchableOpacity,Text ,Alert} from 'react-native';
import { TextInput } from 'react-native-gesture-handler';
import { Formik } from 'formik';
import * as Yup from 'yup';
import auth, { firebase } from '@react-native-firebase/auth';


class Register extends React.Component {
    constructor(props) {
        super(props);
        this.state={
            password:true
                    }
    }

    _handleSubmit=(values)=>{
        auth()
  .createUserWithEmailAndPassword(values.email, values.password)
  .then(() => {
    const user=firebase.auth().currentUser;
    user.updateProfile({displayName:values.username});
   /* const timestamp = firebase.database.ServerValue.TIMESTAMP;
    const newReference = firebase.app().database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/').ref(`users/${user.uid}`).push();
    newReference.set({
      userId: user.uid,
      userName: values.userName,
      createTime: timestamp,
      lastOnlineTime: timestamp,
      online:true,
      friends:[],
      friendRequests:[],
      groups:[],
  }).then(() => {
      
  }).catch((error) => {
      
  });*/
    this.props.navigation.reset({
        index: 0,
        routes: [{ name: 'Home' }],
      });

      
  })
  .catch(error => {
   /* if (error.code === 'auth/email-already-in-use') {
        alert('That email address is already in use!');
    }

    if (error.code === 'auth/invalid-email') {
        alert('That email address is invalid!');
    }*/
    Alert.alert(
        "Error", 
        "Make sure that your e-mail address is correct and your password is longer than 6 characters. Please try again later.", 
        [
          {
            text: 'Okey',
            onPress: () => {},
            
          },
        ],
        
      );
      return;
  });
    }
    state = {  }
    render() { 
        const {navigation}=this.props;
        return ( 
        <SafeAreaView style={{backgroundColor:'white',flex:1}}>
 <View>
            <View style={{alignItems:'center', flexDirection:'row',justifyContent:'center',paddingTop:65}}><Image style={style.image} source={require("../../../assets/images/logo.png")}></Image></View>

        <View style={style.board}>
            <Formik
            initialValues={{username:'', email:'', password:''}}
                onSubmit={this._handleSubmit}
                validationSchema={Yup.object().shape({
        username:Yup.string().required("Username is required"),
        password:Yup.string().required("Password is required"),
        email:Yup.string().email().required("E-Mail adress is required")
    })}>{({values,handleSubmit,handleChange,errors})=>(
                
                <View>
                <View style={{marginBottom:20}}>
          <TextInput value={values.username}
        onChangeText={handleChange("username")} style={style.item} placeholder='Username' >
</TextInput>{(errors.username)&&<Text style={{color:'#FF8400'}}>{errors.username}</Text>}
            </View>  
            <View style={{marginBottom:20}}>
          <TextInput value={values.email}
        onChangeText={handleChange("email")} style={style.item} placeholder='E-Mail'keyboardType={"email-address"} >
</TextInput>{(errors.email)&&<Text style={{color:'#FF8400'}}>{errors.email}</Text>}
            </View>  
            <View style={{marginBottom:20}}>
          <TextInput style={style.item} placeholder='Password' secureTextEntry={this.state.password} value={values.password}
        onChangeText={handleChange("password")}>
</TextInput>{(errors.password)&&<Text style={{color:'#FF8400'}}>{errors.password}</Text>}
<TouchableOpacity style={{position:'absolute', top:13,right:10}} onPress={()=>{this.setState({password:!this.state.password})}}><Image style={{width:25,height:25, }} source={(this.state.password)?require('../../../assets/images/eyehide.png'):require('../../../assets/images/eye.png')}></Image></TouchableOpacity>
            </View>  
            <View><TouchableOpacity onPress={handleSubmit} style={style.button}><Text style={{color:'white',fontSize:20}}>Register</Text></TouchableOpacity></View>
                </View>)}
            </Formik>
          
        </View>
        <View style={{flexDirection:'row', alignItems:'center',justifyContent:'center', marginTop:40}}><TouchableOpacity onPress={()=>{navigation.goBack();}}><Text style={{fontSize:17}}>
        Already have an account? <Text style={{color:'#FFB19D'}}>Login</Text> </Text></TouchableOpacity></View>
        
        </View>
        </SafeAreaView>
        );
    }
}
 
const style=StyleSheet.create({
    image:{width:200,height:200, alignItems:'center', flexDirection:'row',justifyContent:'center',resizeMode:'contain'},
    board:{marginTop:30, paddingHorizontal:20},
    item:{backgroundColor:"#F7F7F7",paddingVertical:10,paddingHorizontal:30,height:50,borderWidth:0.5, borderColor:'#B0B0C3'},
    button:{backgroundColor:'#FF8400',paddingVertical:15, borderRadius:5,marginTop:30,alignItems:'center'}
})

export default Register;