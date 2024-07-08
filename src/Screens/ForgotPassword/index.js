import React from 'react'
import { Image, StyleSheet, View,Text, TouchableOpacity,Alert } from 'react-native';
import { TextInput } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Formik } from 'formik';
import * as Yup from 'yup';
import auth from '@react-native-firebase/auth'


class ForgotPassword extends React.Component {
    constructor(props) {
        super(props);
    }
    state = {  }

    _handleSubmit=(values)=>{
        auth()
        .sendPasswordResetEmail(values.email)
        .then(() => {
            alert("ok");
        })
        .catch(error => {
          
      
            Alert.alert(
                "Error", 
                "Make sure your e-mail is correct."             
                ,[
                  {
                    text: 'Okey',
                    onPress: () => {},
                    
                  },
                ],
                
              );
        return;
      
        });
    }
    render() { 
      
        const {navigation}=this.props;
        return ( <SafeAreaView style={style.body}>
<View style={{alignItems:'center'}}><Image style={style.image} source={require('../../../assets/images/logo.png')} ></Image></View>
<View style={style.board}>
    <Formik
    initialValues={{email:''}}
    onSubmit={this._handleSubmit}
    validationSchema={Yup.object().shape({
        email:Yup.string().email().required("E-Mail adress is required")
       
    })}
    >{({values,handleSubmit,handleChange,errors})=>(
        <View>
            <View style={style.item}>
        <TextInput 
        value={values.email}
        onChangeText={handleChange("email")}
        placeholder='E-Mail' style={style.input} keyboardType={"email-address"}></TextInput>{(errors.email)&&<Text style={{color:'#FF8400'}}>{errors.email}</Text>}
    
        </View>
        
        
    <View style={style.item}><TouchableOpacity
    onPress={handleSubmit}
    style={style.button}><Text style={{color:'white',fontSize:20}}>Send E-Mail</Text></TouchableOpacity></View>
        </View>
        
    )}
   
    </Formik>
    

    <View style={style.item}><TouchableOpacity onPress={()=>{navigation.goBack();}} style={{justifyContent:'center', flexDirection:'row'}}><Text style={{fontSize:17}}>Did You Remember Your Password? <Text style={{color:'#FFB19D'}}>Login</Text></Text></TouchableOpacity></View>
    </View>

        </SafeAreaView> );
    }
}
const style =StyleSheet.create({
    body:{backgroundColor:"white", flex:1},
    image:{height:200, width:200, alignItems:'center',resizeMode:'contain',marginTop:150},
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
export default ForgotPassword;