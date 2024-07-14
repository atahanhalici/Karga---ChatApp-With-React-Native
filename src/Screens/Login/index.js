import React from 'react'
import { Image, StyleSheet, View,Text, TouchableOpacity,Alert, ScrollView} from 'react-native';
import { TextInput } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Formik } from 'formik';
import * as Yup from 'yup';
import auth from '@react-native-firebase/auth';
import messaging from '@react-native-firebase/messaging'
import firebase from '@react-native-firebase/app';

class Login extends React.Component {
    constructor(props) {
        super(props);
        this.state={
password:true
        }
    }
    state = {  }

    _handleSubmit = async (values) => {
      try {
        await auth().signInWithEmailAndPassword(values.email, values.password);
    
        const user = firebase.auth().currentUser;
        if (user) {
          const fcmToken = await firebase.messaging().getToken();
          const updateData = {
            fcmToken: fcmToken,
          };
    
          const userRef = firebase
            .app()
            .database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/')
            .ref(`users/${user.uid}`);
    
          await userRef.update(updateData);
          console.log('FCM Token güncellendi.');
    
          this.props.navigation.reset({
            index: 0,
            routes: [{ name: 'Home' }],
          });
        } else {
          console.error('Kullanıcı bulunamadı.');
        }
      } catch (error) {
        console.error('Giriş sırasında bir hata oluştu:', error);
    
        Alert.alert(
          'Error',
          'Make sure your e-mail or password is correct.',
          [
            {
              text: 'Okey',
              onPress: () => {},
            },
          ],
        );
      }
    };

    showAlert = (baslik, icerik) => {
        Alert.alert(
          baslik, 
          icerik, 
          [
            {
              text: 'Okey',
              onPress: () => {},
              
            },
          ],
          
        );
      };

    
    render() { 
      
        const {navigation}=this.props;
        return ( <SafeAreaView style={style.body}>
<View style={{alignItems:'center'}}><Image style={style.image} source={require('../../../assets/images/logo.png')} ></Image></View>
<View style={style.board}>
    <Formik
    initialValues={{email:'',password:''}}
    onSubmit={this._handleSubmit}
    validationSchema={Yup.object().shape({
        email:Yup.string().required("E-Mail adress is required"),
        password:Yup.string().required("Password is required"),
    })}
    >{({values,handleSubmit,handleChange,errors})=>(
        <View>
            <View style={style.item}>
        <TextInput 
        value={values.email}
        onChangeText={handleChange("email")}
        keyboardType={"email-address"}
        placeholder='E-Mail' style={style.input}></TextInput>{(errors.email)&&<Text style={{color:'#FF8400'}}>{errors.email}</Text>}
    
        </View>
        <View style={style.item}>
        <TextInput 
        value={values.password}
        onChangeText={handleChange("password")}
        secureTextEntry={this.state.password} placeholder='Password' style={style.input}></TextInput>{(errors.password)&&<Text style={{color:'#FF8400'}}>{errors.password}</Text>}
        <TouchableOpacity 
        style={{ position:'absolute',top:13,right:10}} onPress={()=>{this.setState({password:!this.state.password})}}><Image source={(this.state.password)?require('../../../assets/images/eyehide.png'):require('../../../assets/images/eye.png')} style={{width:25,height:25}}></Image></TouchableOpacity>
    
        </View>
        <View style={[style.item, {flexDirection:'row', justifyContent:"flex-end"}]}><TouchableOpacity  onPress={()=>{navigation.navigate("Forgot Password")}}><Text>Forgot your password?</Text></TouchableOpacity>

    </View>
    <View style={style.item}><TouchableOpacity
    onPress={handleSubmit}
    style={style.button}><Text style={{color:'white',fontSize:20}}>Login</Text></TouchableOpacity></View>
        </View>
        
    )}
   
    </Formik>
    
    <View style={[style.item,{justifyContent:'center',flexDirection:'row',alignItems:'center'}]}><Text>or</Text></View>
    <View style={style.social}>
        <TouchableOpacity onPress={() => this.showAlert("Login with Facebook", "Currently Not Available")} style={style.social_item}>
<Image style={style.social_icon}source={require('../../../assets/images/facebook.png')}></Image>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => this.showAlert("Login with X", "Currently Not Available")} style={style.social_item}>
<Image style={style.social_icon}source={require('../../../assets/images/x.png')}></Image>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => this.showAlert("Login with Google", "Currently Not Available")} style={style.social_item}>
<Image style={style.social_icon}source={require('../../../assets/images/google.png')}></Image>
        </TouchableOpacity>
    </View>
    <View style={style.item}><TouchableOpacity onPress={()=>{navigation.navigate("Register")}} style={{justifyContent:'center', flexDirection:'row'}}><Text style={{fontSize:17}}>Don't have an account? <Text style={{color:'#FFB19D'}}>Sign Up</Text></Text></TouchableOpacity></View>
    </View>

      </SafeAreaView> );
    }
}

const style =StyleSheet.create({
body:{backgroundColor:"white", flex:1},
image:{height:200, width:200, alignItems:'center',resizeMode:'contain',marginTop:65},
board:{marginTop:30,paddingHorizontal:30},
item:{marginBottom:20},
input:{backgroundColor:"#F7F7F7",paddingVertical:10,paddingHorizontal:30,height:50,borderWidth:0.5, borderColor:'#B0B0C3'},
button:{backgroundColor:'#FF8400',paddingVertical:15, borderRadius:5, justifyContent:'center',alignItems:'center',marginTop:30},
social:{flexDirection:'row',justifyContent:'space-around',marginBottom:30},
social_item:{
    padding:10, width:100,height:60, justifyContent:'center',alignItems:'center',
},
social_icon:{resizeMode:'contain', width:100,height:40}
})
 
export default Login;