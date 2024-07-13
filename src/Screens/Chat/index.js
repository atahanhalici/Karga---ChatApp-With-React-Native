import React, { Component } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, SafeAreaView } from 'react-native';
import Message from '../../Components/Rooms/Message';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { TouchableOpacity } from 'react-native-gesture-handler';
import auth from '@react-native-firebase/auth';
import firebase from '@react-native-firebase/app';



class Chat extends Component {
    constructor(props) {
        super(props);
        this.state = {
            messages: [],
            text: '',
            connectedUserCount: 0
        };
    }

    // Kullanıcı bağlantı durumu düşürme işlevi
 decreaseConnectedUserCount = (roomId) => {

    // Firebase referansı oluşturun
    const roomRef = firebase.app().database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/').ref(`rooms/${roomId}`);

    // Kullanıcı bağlantısı kesildiğinde bu işlemi yap
    roomRef.onDisconnect().update({
        connectedUserCount: firebase.database.ServerValue.increment(-1)
    });
};

cancelDisconnect = (roomId) => {
    const roomRef = firebase.app().database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/').ref(`rooms/${roomId}`);
        
            roomRef.onDisconnect().cancel(); // Firebase'de onDisconnect'i iptal et
        
    };

    renderItem = ({ item, index }) => {
        return <Message item={item} index={index}></Message>;
    };

    componentDidMount() {
        const { roomId, conversationId, name } = this.props.route.params;
        this.props.navigation.setOptions({
            title: name,
        });

        if (roomId) {
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
                        timestamp: item.val().timestamp, // Zaman damgasını dahil et
                        id: item.key
                    });
                });
                // Tarihe göre sıralama
                messages.sort((a, b) => b.timestamp - a.timestamp);
                
                this.setState({ messages });
            });

            firebase.app().database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/')
                .ref(`rooms/${roomId}/connectedUserCount`)
                .on('value', snapshot => {
                    this.setState({ connectedUserCount: snapshot.val() || 0 });
                });

            // Kullanıcı bağlantısı kesildiğinde bağlı kullanıcı sayısını azalt
            this.decreaseConnectedUserCount(roomId);
        } else if (conversationId) {
            this.fetchConversationMessages(conversationId);
        }
    }

    componentWillUnmount() {
        const { roomId } = this.props.route.params;
        if (roomId) {
            this.cancelDisconnect(roomId);
            this.leaveRoom(roomId);

        }
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

    fetchConversationMessages = (conversationId) => {
        firebase.app().database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/')
            .ref(`conversations/${conversationId}/messages`)
            .orderByChild('timestamp') // timestamp alanına göre sıralama
            .on('value', snapshot => {
                var messages = [];
                snapshot.forEach((item) => {
                    messages.push({
                        conversationId: item.val().conversationId,
                        text: item.val().text,
                        userName: item.val().userName,
                        userId: item.val().userId,
                        timestamp: item.val().timestamp, // Zaman damgasını dahil et
                        id: item.key
                    });
                });
                // Tarihe göre sıralama
                messages.sort((a, b) => b.timestamp - a.timestamp);
                
                this.setState({ messages });
            });
    };

    handleSend = () => {
        const { text } = this.state;
        const { roomId, conversationId } = this.props.route.params;
    
        const user = auth().currentUser;
    
        const userId = user.uid;
        const userName = user.displayName;
    
        const timestamp = firebase.database.ServerValue.TIMESTAMP; // Firebase tarafından sağlanan anlık zaman bilgisi

        let newReference;

        if (roomId) {
            newReference = firebase.app().database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/').ref(`messages/${roomId}`).push();
        } else if (conversationId) {
            newReference = firebase.app().database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/').ref(`conversations/${conversationId}/messages`).push();
        }
    
        newReference.set({
            text: text,
            userId: userId,
            userName: userName,
            timestamp: timestamp, // Zaman damgası eklendi
        }).then(() => {
            this.setState({ text: '' });
        }).catch((error) => {
            alert("Error! Failed to send message");
            console.error("Error sending message:", error);
        });
    };

    render() {
        const { text, messages, connectedUserCount } = this.state;
        const { roomId } = this.props.route.params;
        return (
            <SafeAreaView style={{ flex: 1 }}>
                {roomId && (
                    <View style={{ padding: 10, backgroundColor: '#ddd', alignItems: 'center', justifyContent: 'center' }}>
                        <Text>Connected Users: {connectedUserCount}</Text>
                    </View>
                )}
                <FlatList
                    inverted
                    ref={(ref) => this.flatListRef = ref}
                    data={messages}
                    style={style.flatlist}
                    renderItem={this.renderItem}
                    keyExtractor={(item) => item.id}
                />
                <View style={style.inputArea}>
                    <View style={{ alignItems: 'center', flexDirection: 'row' }}>
                        <TextInput value={text} onChangeText={(text) => this.setState({ text })} style={style.input} placeholder='Write message..'></TextInput>
                        <TouchableOpacity onPress={this.handleSend}>
                            <Icon name={"paper-plane"} size={25} color='#FF8400'></Icon>
                        </TouchableOpacity>
                    </View>
                </View>
            </SafeAreaView>
        );
    }
}

const style = StyleSheet.create({
    flatlist: {
        flex: 1
    },
    inputArea: {
        padding: 10,
        borderTopColor: '#dedede',
        borderTopWidth: 1
    },
    input: {
        backgroundColor: '#dedede',
        borderRadius: 15,
        paddingLeft: 20,
        flex: 1,
        height: 50,
        marginRight: 20
    },
    send: {
        backgroundColor: '#FF8400',
        paddingHorizontal: 10,
        paddingVertical: 15,
        borderRadius: 8,
    }
});

export default Chat;
