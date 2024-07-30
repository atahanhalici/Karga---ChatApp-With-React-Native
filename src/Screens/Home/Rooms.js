import React, { Component } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Animated, TextInput, Dimensions, FlatList } from 'react-native';
import auth from '@react-native-firebase/auth';
import firebase from '@react-native-firebase/app';
import RoomItem from '../../Components/Rooms/RoomItem';
import database from '@react-native-firebase/database';

class Rooms extends Component {
    constructor(props) {
        super(props);
        this.state = {
            newChatRoomHeight: new Animated.Value(0),
            isNewChatRoomVisible: false,
            newChatRoomButtonText: 'Create a New Chat Room',
            chatRoomName: '',
            rooms: []
        };
    }

    componentDidMount() {
        const user = auth().currentUser;
        firebase.app().database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/')
            .ref('/rooms')
            .on('value', snapshot => {
                const rooms = [];
                snapshot.forEach((item) => {
                    rooms.push({
                        name: item.val().name,
                        userName: item.val().userName,
                        userId: item.val().userId,
                        id: item.key,
                        connectedUserCount: item.val().connectedUserCount
                    });
                });
                this.setState({ rooms: rooms.reverse() });
            });
    }

    handleCreateChatRoom = () => {
        const { chatRoomName } = this.state;

        if (chatRoomName.trim() !== '') {

            const user = auth().currentUser;

            if (user) {
                const userId = user.uid;
                const userName = user.displayName;

                const newReference = firebase.app().database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/').ref('/rooms').push();

                newReference.set({
                    name: chatRoomName,
                    userId: userId,
                    userName: userName,
                    connectedUserCount: 0,
                }).then(() => {


                    this.setState({
                        chatRoomName: '',
                        isNewChatRoomVisible: false,
                        newChatRoomButtonText: 'Create a New Chat Room'
                    }, () => {
                        Animated.timing(this.state.newChatRoomHeight, {
                            toValue: 0,
                            duration: 300,
                            useNativeDriver: false,
                        }).start();
                    });

                }).catch((error) => {
                    alert("Error! Failed to Establish Room");
                    console.error("Error creating chat room:", error);
                });
            } else {
                alert("No user is currently signed in.");
            }
        } else {
            alert('Chat room name cannot be empty');
        }
    }

    toggleNewChatRoom = () => {
        const { isNewChatRoomVisible, newChatRoomHeight } = this.state;
        if (isNewChatRoomVisible) {
            Animated.timing(newChatRoomHeight, {
                toValue: 0,
                duration: 300,
                useNativeDriver: false,
            }).start(() => this.setState({
                isNewChatRoomVisible: false,
                newChatRoomButtonText: 'Create a New Chat Room'
            }));
        } else {
            this.setState({ isNewChatRoomVisible: true, newChatRoomButtonText: 'Close Menu' }, () => {
                Animated.timing(newChatRoomHeight, {
                    toValue: 50,
                    duration: 300,
                    useNativeDriver: false,
                }).start();
            });
        }
    }

    renderItem = ({ item }) => {
        return <RoomItem item={item} navigation={this.props.navigation} />;
    }

    render() {
        const { newChatRoomHeight, isNewChatRoomVisible, newChatRoomButtonText, chatRoomName,rooms } = this.state;
        var filterText=this.props.filterText
        const filteredRooms = filterText.trim() === ""
        ? rooms
        : rooms.filter(room =>
            room.name.toLowerCase().includes(filterText.toLowerCase())
        );
        return (
            <View style={styles.container}>
                <TouchableOpacity style={[styles.newButton, { marginBottom: isNewChatRoomVisible ? 0 : 20 }]} onPress={this.toggleNewChatRoom}>
                    <Text style={styles.newButtonText}>{newChatRoomButtonText}</Text>
                </TouchableOpacity>

                {isNewChatRoomVisible && (
                    <Animated.View style={[styles.newChatRoom, { height: newChatRoomHeight }]}>
                        <TextInput
                            style={styles.newChatRoomInput}
                            placeholder="Enter chat room name"
                            placeholderTextColor="#FF8400"
                            onChangeText={(text) => this.setState({ chatRoomName: text })}
                            value={chatRoomName}
                            onSubmitEditing={this.handleCreateChatRoom}
                        />
                    </Animated.View>
                )}

                <FlatList
                    data={filteredRooms}
                    renderItem={this.renderItem}
                    keyExtractor={(item) => item.id}
                    ItemSeparatorComponent={() => (
                        <View
                            style={{
                                height: 1,
                                width: "100%",
                                backgroundColor: "#CED0CE",
                            }}
                        />
                    )}
                />
            </View>
        );
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
    },
    newButton: {
        backgroundColor: '#FF8400',
        marginVertical: 10,
        borderRadius: 20,
        paddingHorizontal: 10,
        justifyContent: 'center',
        width: Dimensions.get('window').width - 30,
        height: 50,
        alignItems: 'center'
    },
    newButtonText: {
        color: 'white',
        fontWeight: '700',
    },
    newChatRoom: {
        backgroundColor: 'white',
        marginVertical: 10,
        borderColor: '#FF8400',
        borderWidth: 1,
        borderRadius: 20,
        paddingHorizontal: 10,
        width: Dimensions.get('window').width - 30,
        justifyContent: 'center'
    },
    newChatRoomInput: {
        color: '#FF8400',
        width: '100%',
        paddingHorizontal: 10,
        height: 40,
    }
});

export default Rooms;
