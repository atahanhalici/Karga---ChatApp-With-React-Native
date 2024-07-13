// Firebase ve diğer gereksinimleri yükleyin
import React, { Component } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, SafeAreaView } from 'react-native';
import Message from '../../Components/Rooms/Message';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { TouchableOpacity } from 'react-native-gesture-handler';
import auth from '@react-native-firebase/auth';
import firebase from '@react-native-firebase/app';

// Kullanıcı bağlantı durumu düşürme işlevi
const decreaseConnectedUserCount = (roomId) => {
    // Firebase referansı oluşturun
    const roomRef = firebase.app().database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/').ref(`rooms/${roomId}`);

    // Kullanıcı bağlantısı kesildiğinde bu işlemi yap
    roomRef.onDisconnect().update({
        connectedUserCount: firebase.database.ServerValue.increment(-1)
    });
};

class Chat extends Component {
    constructor(props) {
        super(props);
        this.state = {
            messages: [],
            text: '',
            connectedUserCount: 0
        };
    }

    renderItem = ({ item, index }) => {
        return <Message item={item} index={index}></Message>;
    };

    componentDidMount() {
        const { roomId, name } = this.props.route.params;
        console.log(name);
        this.props.navigation.setOptions({
            title: name,
        });

        this.joinRoom(roomId);

        firebase.app().database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/')
        .ref(`messages/${roomId}`)
        .orderByChild('timestamp') // timestamp alanına göre sıralama
        .on('value', snapshot => {
            var messages = [];
            snapshot.forEach((item) => {
                messages.push({
                    roomId: item.val().roomId,
                    text: item.val().text,
                    userName: item.val().userName,
                    userId: item.val().userId,
                    id: item.key
                });
            });
            // Tarihe göre sıralama
            messages.sort((a, b) => a.timestamp - b.timestamp);
            
            this.setState({ messages });
        });

        firebase.app().database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/')
            .ref(`rooms/${roomId}/connectedUserCount`)
            .on('value', snapshot => {
                this.setState({ connectedUserCount: snapshot.val() || 0 });
            });

        // Kullanıcı bağlantısı kesildiğinde bağlı kullanıcı sayısını azalt
        decreaseConnectedUserCount(roomId);
    }

    componentWillUnmount() {
        const { roomId } = this.props.route.params;
        this.leaveRoom(roomId);
    }

    joinRoom = async (roomId) => {
        const roomRef = firebase.app().database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/').ref(`rooms/${roomId}/connectedUserCount`);
        await roomRef.transaction(count => {
            return (count || 0) + 1;
        });
    };

    leaveRoom = async (roomId) => {
        const roomRef = firebase.app().database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/').ref(`rooms/${roomId}/connectedUserCount`);
        await roomRef.transaction(count => {
            return (count || 0) - 1;
        });
    };

    handleSend = () => {
        const { text } = this.state;
        const { roomId } = this.props.route.params;
    
        console.log(roomId);
        const user = auth().currentUser;
    
        const userId = user.uid;
        const userName = user.displayName;
    
        const timestamp = firebase.database.ServerValue.TIMESTAMP; // Firebase tarafından sağlanan anlık zaman bilgisi
    
        const newReference = firebase.app().database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/').ref(`messages/${roomId}`).push();
    
        newReference.set({
            roomId,
            text: text,
            userId: userId,
            userName: userName,
            timestamp: timestamp, // Zaman damgası eklendi
        }).then(() => {
            this.setState({ text: '' });
        }).catch((error) => {
            alert("Error! Failed to Establish Room");
            console.error("Error creating chat room:", error);
        });
    };
    

    render() {
        const { text, messages, connectedUserCount } = this.state;
        return (
            <SafeAreaView style={{ flex: 1 }}>
                <View style={{ padding: 10, backgroundColor: '#ddd', alignItems: 'center', justifyContent: 'center' }}>
                    <Text>Connected Users: {connectedUserCount}</Text>
                </View>
                <FlatList
                    inverted
                    ref={(ref) => this.flatListRef = ref}
                    data={messages.reverse()}
                    style={style.flatlist}
                    renderItem={this.renderItem}
                />
                <View style={style.inputArea}>
                    <View style={{ alignItems: 'center', flexDirection: 'row' }}>
                        <TextInput value={text} onChangeText={(text) => this.setState({ text })} style={style.input} placeholder='Write message..'></TextInput>
                        <TouchableOpacity onPress={this.handleSend}><Icon name={"paper-plane"} size={25}></Icon></TouchableOpacity>
                    </View>
                </View>
            </SafeAreaView>
        );
    }
}

const style = StyleSheet.create({
    flatlist: { flex: 1, padding: 10 },
    inputArea: { flexDirection: 'column', justifyContent: 'flex-end', padding: 15, },
    input: {
        height: 40, paddingHorizontal: 20, color: 'black', borderWidth: 1, borderColor: '#FF8400', flex: 1, marginRight: 10
    }
});

export default Chat;
