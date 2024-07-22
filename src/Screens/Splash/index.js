import React from "react";
import { View,Image,Text,StyleSheet} from 'react-native';
import auth from '@react-native-firebase/auth';
import { SafeAreaView } from "react-native-safe-area-context";

class Splash extends React.Component {
   
    componentDidMount () {
        const user = auth().currentUser;
        setTimeout(() => {
          
    
          if (user) {
            this.props.navigation.reset({
              index: 0,
              routes: [{ name: 'Home' }],
            });
          } else {
            this.props.navigation.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            });
          }
        }, 500); // 3 saniye bekletmek için 3000 milisaniye kullanıyoruz
      }
    
      render() { 
        return (
          <SafeAreaView style={styles.container}>
            <View style={{flex:1}}></View>
            <View style={styles.logoContainer}>
              <Image
                style={styles.logo}
                source={require('../../../assets/images/logo.png')}
              />
            </View>
            <View style={{ flex: 1, justifyContent: 'flex-end' }}>
              <Text style={styles.footerText}>All Rights Reserved © 2024 Karga App</Text>
            </View>
          </SafeAreaView>
        );
      }}
      const styles = StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: 'white',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
        },
        logoContainer: {
          alignItems: 'center',
        },
        logo: {
          height: 200,
          width: 200,
          resizeMode: 'contain',
          marginBottom: 70,
        },
        footerText: {
          alignSelf: 'center', // Ortaya hizala
          marginBottom: 20, // İstenilen alt boşluk miktarına göre ayarlayabilirsiniz
        },
      });
      
export default Splash;