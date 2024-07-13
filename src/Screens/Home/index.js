import React, { Component } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Animated, TextInput, Dimensions } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/FontAwesome5';
import auth from '@react-native-firebase/auth'
import database from '@react-native-firebase/database';
import firebase from '@react-native-firebase/app'
import RoomItem from '../../Components/Rooms/RoomItem';
import { FlatList } from 'react-native-gesture-handler';


class Home extends Component {
    constructor(props) {
        super(props);
        this.state = {
            selectedTab: 'Friends',
            searchBarHeight: new Animated.Value(0), // Başlangıç yüksekliği
            isSearchBarVisible: false,
            newChatRoomHeight: new Animated.Value(50), // Yeni chat odası düğmesinin başlangıç yüksekliği
            isNewChatRoomVisible: false,
            newChatRoomButtonText: 'Create a New Chat Room', // Başlangıç düğme metni
            chatRoomName: '',
            rooms:[]
        };
        
        
    }

    componentDidMount(){        
        const user=auth().currentUser;
        firebase.app().database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/')
            .ref('/rooms')
            .on('value',snapshot=>
             {
                var rooms=[];
snapshot.forEach((item) => {

    rooms.push({
        name:item.val().name,
        userName:item.val().userName,
        userId:item.val().userId,
        id:item.key,
        connectedUserCount:item.val().connectedUserCount
    })   
});
rooms=rooms.reverse();
    this.setState({rooms})
    console.log(this.state.rooms);
  });




    }

    logout=()=>{
        auth().signOut().then(()=>{
            this.props.navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              });
        })
    }

    handleCreateChatRoom = () => {
        const { chatRoomName } = this.state;

        if (chatRoomName.trim() !== '') {
            console.log('Creating chat room with name:', chatRoomName);
            const user = auth().currentUser;

            if (user) {
                const userId = user.uid;
                const userName = user.displayName;

                const newReference = firebase.app().database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/').ref('/rooms').push();

                newReference.set({
                    name: chatRoomName,
                    userId: userId,
                    userName: userName,
                    connectedUserCount:0,
                }).then(() => {
                    console.log("Chat room created successfully");

                    this.setState({
                        chatRoomName: '',
                        isNewChatRoomVisible: false,
                        newChatRoomButtonText: 'Create a New Chat Room'
                    }, () => {
                        Animated.timing(this.state.newChatRoomHeight, {
                            toValue: 50, // Başlangıç yüksekliği
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
            // Chat odası ismi boşsa kullanıcıyı uyarabilir veya başka bir işlem yapabilirsiniz
            alert('Chat room name cannot be empty');
        }
    }

    handleTabPress = (tab) => {
        this.setState({ selectedTab: tab });
    }

    toggleNewChatRoom = () => {
        const { isNewChatRoomVisible, newChatRoomHeight } = this.state;
        if (isNewChatRoomVisible) {
            // Yeni chat odası girişini kapat
            Animated.timing(newChatRoomHeight, {
                toValue: 0, // Başlangıç yüksekliği
                duration: 300,
                useNativeDriver: false,
            }).start(() => this.setState({
                isNewChatRoomVisible: false,
                newChatRoomButtonText: 'Create a New Chat Room' // Düğme metnini güncelle
            }));
        } else {
            // Yeni chat odası girişini aç
            this.setState({ isNewChatRoomVisible: true, newChatRoomButtonText: 'Close Menu' }, () => {
                Animated.timing(newChatRoomHeight, {
                    toValue: 150, // Açıldığında yeni yükseklik
                    duration: 300,
                    useNativeDriver: false,
                }).start();
            });
        }
    }


    handleTabPress = (tab) => {
        this.setState({ selectedTab: tab });
    }
    toggleNewChatRoom = () => {
        const { isNewChatRoomVisible, newChatRoomHeight } = this.state;
        if (isNewChatRoomVisible) {
            // Yeni chat odası girişini kapat
            Animated.timing(newChatRoomHeight, {
                toValue: 0, // Başlangıç yüksekliği
                duration: 300,
                useNativeDriver: false,
            }).start(() => this.setState({ 
                isNewChatRoomVisible: false, 
                newChatRoomButtonText: 'Create a New Chat Room' // Düğme metnini güncelle
            }));
        } else {
            // Yeni chat odası girişini aç
            this.setState({ isNewChatRoomVisible: true, newChatRoomButtonText: 'Close Menu' }, () => {
                Animated.timing(newChatRoomHeight, {
                    toValue: 50, // Açıldığında yeni yükseklik
                    duration: 300,
                    useNativeDriver: false,
                }).start();
            });
        }
    }
    
    toggleSearchBar = () => {
        const { isSearchBarVisible, searchBarHeight } = this.state;
        if (isSearchBarVisible) {
            // Search bar'ı kapat
            Animated.timing(searchBarHeight, {
                toValue: 0,
                duration: 300,
                useNativeDriver: false,
            }).start(() => this.setState({ isSearchBarVisible: false }));
        } else {
            // Search bar'ı aç
            this.setState({ isSearchBarVisible: true }, () => {
                Animated.timing(searchBarHeight, {
                    toValue: 40, // Yüksekliğini ayarlayın
                    duration: 300,
                    useNativeDriver: false,
                }).start();
            });
        }
    }

renderItem=({item})=>{
return <RoomItem item={item} navigation={this.props.navigation}/>
}


    render() {
        const { selectedTab, searchBarHeight, isSearchBarVisible, newChatRoomHeight, isNewChatRoomVisible, newChatRoomButtonText } = this.state;
        return (
            <LinearGradient
                style={styles.background}
                start={{ x: 0, y: 0 }}
                end={{ x: 0.8, y: 0 }}
                colors={['#FF8400', '#FFA500']}
            >
                <View style={{ marginHorizontal: 15, marginVertical: 20 }}>
                    <View style={[styles.header, { marginBottom: isSearchBarVisible ? 0 : 20 }]}>
                        <Text style={styles.title}>Karga</Text>
                        <TouchableOpacity onPress={this.toggleSearchBar}>
                            <Icon name={"search"} size={27} color={"white"} />
                        </TouchableOpacity>
                    </View>
    
                    {isSearchBarVisible && (
                        <Animated.View style={[styles.searchBar, { height: searchBarHeight }]}>
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Search..."
                                placeholderTextColor="#FF8400"
                            />
                        </Animated.View>
                    )}
                    <View style={styles.tabs}>
                        {['Friends', 'Groups', 'Rooms', 'Profile'].map((tab) => (
                            <TouchableOpacity
                                key={tab}
                                style={[
                                    styles.tab,
                                    selectedTab === tab && styles.selectedTab
                                ]}
                                onPress={() => this.handleTabPress(tab)}
                            >
                                <Text style={[
                                    styles.tabTitle,
                                    selectedTab === tab ? styles.selectedTabTitle : styles.unselectedTabTitle
                                ]}>
                                    {tab}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
                <View style={styles.container}>
                  
                    <TouchableOpacity style={[styles.newButton, { marginBottom: isNewChatRoomVisible ? 0 : 20 }]} onPress={this.toggleNewChatRoom}>
                        <Text style={[styles.unselectedTabTitle, { fontWeight: 600 }]}>{newChatRoomButtonText}</Text>
                    </TouchableOpacity>
                    {isNewChatRoomVisible && (
                        <Animated.View style={[styles.newChatRoom, { height: newChatRoomHeight }]}>
                            <TextInput
                                style={styles.newChatRoomInput}
                                placeholder="Enter chat room name..."
                                placeholderTextColor="#FF8400"
                                value={this.state.chatRoomName}
        onChangeText={(text) => this.setState({ chatRoomName: text })}
        onSubmitEditing={this.handleCreateChatRoom}
                            />
                        </Animated.View>
                    )}
                    <FlatList data={this.state.rooms} renderItem={this.renderItem}  ItemSeparatorComponent={() => (
        <View
            style={{
                height: 1,
                width: "100%",
                backgroundColor: "#CED0CE",
            }}
        />
    )} >

                    </FlatList>
                </View>
            </LinearGradient>
        );
    }
    
}

    const styles = StyleSheet.create({
        background: { flex: 1 },
        header: { flexDirection: 'row', justifyContent: 'space-between', },
        title: { fontSize: 27, fontWeight: '800', color: 'white' },
        searchBar: {
            backgroundColor: 'white',
            marginVertical: 10,
            borderColor: '#FF8400',
            borderWidth: 1,
            borderRadius: 20,
            paddingHorizontal: 10,
            alignSelf: 'center',
            justifyContent: 'center',
            width: Dimensions.get('window').width - 30, // Ekran genişliğini kapsayacak şekilde ayarlandı
        },
        newButton:{ 
            backgroundColor: '#FF8400',
            width: Dimensions.get('window').width - 30,
            marginHorizontal: 8,
            borderRadius: 20,
            padding: 10,
            alignItems: 'center',
           
        },
        searchInput: {
            color: '#FF8400',
            flex: 1,
        },
        tabs: { flexDirection: 'row', justifyContent: 'space-around' },
        tab: {
            backgroundColor: 'transparent',
            flex: 1,
            marginHorizontal: 8,
            borderRadius: 20,
            height: 30,
            alignItems: 'center',
            justifyContent: 'center',
        },
        selectedTab: {
            backgroundColor: 'white',
        },
        tabTitle: { fontWeight: '600' },
        selectedTabTitle: { color: '#FF8400' },
        unselectedTabTitle: { color: 'white' },
        container: {
            backgroundColor: 'white',
            flex: 1,
            borderTopRightRadius: 30,
            borderTopLeftRadius: 30,
            alignItems: 'center',
            paddingTop: 20,
            
        },
        newChatRoom: {
            backgroundColor: 'white',
            marginVertical: 10,
            borderColor: '#FF8400',
            borderWidth: 1,
            borderRadius: 20,
            paddingHorizontal: 10,
            justifyContent: 'center',
            width: Dimensions.get('window').width - 30,
            alignItems: 'center'
        },
        newChatRoomInput: {
            color: '#FF8400',
            width: '100%',
            paddingHorizontal: 10
        }
    });
    

export default Home;
