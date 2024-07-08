import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import Login from "./Screens/Login/index";
import Register from "./Screens/Register/index";
import ForgotPassword from "./Screens/ForgotPassword/index";
import Home from './Screens/Home/index'
import { createStackNavigator } from '@react-navigation/stack'
import Splash from './Screens/Splash/index'

const Stack=createStackNavigator();

export default class Route extends React.Component{
   
render(){
  return <NavigationContainer>
  <Stack.Navigator initialRouteName="Splash">
    <Stack.Screen name="Login" component={Login} options={{ headerShown: false }}/>
    <Stack.Screen name="Register" component={Register} options={{ headerShown: false }}/>
    <Stack.Screen name="Forgot Password" component={ForgotPassword} options={{ headerShown: false }}/>
    <Stack.Screen name="Home" component={Home} options={{ headerShown: false }}/>
    <Stack.Screen name="Splash" component={Splash} options={{ headerShown: false }}/>
  </Stack.Navigator>
</NavigationContainer>
}
}