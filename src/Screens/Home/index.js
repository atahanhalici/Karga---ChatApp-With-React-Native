import React from "react";
import {View,TouchableOpacity, SafeAreaView,Text} from 'react-native';
import auth from '@react-native-firebase/auth';

class Home extends React.Component {
    constructor(props) {
        super(props);
    }
    state = {  }

    logout=()=>{
        auth()
  .signOut()
  .then(() => {
    this.props.navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
  });
    }
    render() { 
        return ( <SafeAreaView>
<TouchableOpacity onPress={this.logout}><Text>Logout</Text></TouchableOpacity>

        </SafeAreaView> );
    }
}
 
export default Home;