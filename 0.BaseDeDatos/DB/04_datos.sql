/*M!999999\- enable the sandbox mode */ 
-- MariaDB dump 10.19-11.7.2-MariaDB, for debian-linux-gnu (x86_64)
--
-- Host: localhost    Database: sistema_vehicular
-- ------------------------------------------------------
-- Server version	11.7.2-MariaDB-ubu2404

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*M!100616 SET @OLD_NOTE_VERBOSITY=@@NOTE_VERBOSITY, NOTE_VERBOSITY=0 */;

--
-- Dumping data for table `address`
--

LOCK TABLES `address` WRITE;
/*!40000 ALTER TABLE `address` DISABLE KEYS */;
INSERT INTO `address` (`user_id`, `address_line1`, `address_line2`, `province`, `canton`, `postal_code`) VALUES (1,NULL,NULL,NULL,NULL,NULL),
(2,NULL,NULL,NULL,NULL,NULL),
(3,NULL,NULL,NULL,NULL,NULL);
/*!40000 ALTER TABLE `address` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `audatex_oportunidades_sync`
--

LOCK TABLES `audatex_oportunidades_sync` WRITE;
/*!40000 ALTER TABLE `audatex_oportunidades_sync` DISABLE KEYS */;
INSERT INTO `audatex_oportunidades_sync` (`wan`, `aseguradora`, `cotizacion_id`, `taller`, `poliza`, `siniestro`, `matricula`, `armadora`, `modelo`, `anio`, `fecha_cotizacion`, `pendientes`, `estado`, `estado_interaccion`, `ultima_vez_visto`, `creado_en`, `actualizado_en`, `detalle_json`) VALUES ('/crZWsa8PDk=','Instituto Nacional de Seguros (INSCR)','21510','INS TALLER COSTARICA','0109AUT049901601','CAS-2470791-D2S6','PART-PAR-BQL058','SUZUKI',NULL,NULL,'13/10/2026 17:06',12,'ACTIVA','NUEVA','2026-10-17 13:23:11','2026-10-17 19:23:09','2026-10-17 19:23:09','{\"repuestos\":[],\"datosCotizacion\":{}}'),
('0zuE1DAirOs=','Instituto Nacional de Seguros (INSCR)','21517','INS TALLER CAPIRA S RL','0114AUT028101400','CAS-2464847-H0Y7','PART-PAR-CYM017','NISSAN','NISSAN/MARCH K13/BASIS','2019','13/10/2026 17:49',0,'CERRADA','NUEVA','2026-10-17 12:59:53','2026-10-17 18:59:56','2026-10-17 18:59:56','{\"repuestos\":[],\"datosCotizacion\":{\"Número Cotización\":\"21517\",\"Fecha de Creación\":\"13/10/2026 17:49\",\"Número Siniestro\":\"CAS-2464847-H0Y7\",\"RFC Asegurado\":\"204960402\",\"Nombre Asegurado\":\"ANA MANETH CARRANZA GONZALEZ\",\"Número Póliza/Documento\":\"0114AUT028101400\",\"Nombre Valuador\":\"Leonardo Fernández EN\",\"Aseguradora\":\"Instituto Nacional de Seguros (INSCR)\",\"Descripción\":\"NISSAN/MARCH K13/BASIS\",\"Armadora\":\"NISSAN\",\"Matricula\":\"PART-PAR-CYM017\",\"Chasis\":\"94DFCUK13KB206095\",\"Año Modelo\":\"2019\",\"Año Fabricación\":\"2019\",\"KM\":\"83809\",\"Nombre Taller\":\"INS TALLER CAPIRA S RL\",\"RFC\":\"3102177277INS\",\"Inscripción Estadual\":\"0\",\"País\":\"Costa Rica\",\"Estado\":\"Alajuela\",\"Ciudad\":\"02 San Ramón\",\"Codigo Postal\":\"20201\",\"Calle\":\"50 N DE LA CLINICA DE LA CCSS\",\"Colonia\":\"ALAJUELA\",\"Nombre Contacto\":\"INS TALLER CAPIRA S RL INS TALLER CAPIRA S RL\",\"Teléfono\":\"24453047\",\"E-mail\":\"taller@tallercapira.com\"}}'),
('2eEd0PxUlSI=','Instituto Nacional de Seguros (INSCR)','21509','INS TALLER DE ENDEREZADO Y PINTURA MVC S.A.','0116AUT036176201','CAS-2469526-Y3F6','PART-PAR-STL321','CHRYSLER',NULL,NULL,'13/10/2026 17:01',1,'ACTIVA','NUEVA','2026-10-17 13:23:08','2026-10-17 19:23:06','2026-10-17 19:23:06','{\"repuestos\":[],\"datosCotizacion\":{}}'),
('2mhgkRpXwxU=','Instituto Nacional de Seguros (INSCR)','21512','INS TALLER RK DE ESCAZU SA','0203AUT000732501','CAS-2468140-Y9Y3','PART-PAR-CCL540','HYUNDAI','HYUNDAI/GRAND I10 (AI3)/GRAND I10','2025','13/10/2026 17:22',1,'ACTIVA','NUEVA','2026-10-17 13:00:37','2026-10-17 19:00:38','2026-10-17 19:00:38','{\"repuestos\":[{\"PartNumber\":\"66311K6000\",\"Part Serial Number\":\"30687415010010WANCR57100400078\",\"Descripcion Pieza\":\"GUARDABARRO I.\"}],\"datosCotizacion\":{\"Número Cotización\":\"21512\",\"Fecha de Creación\":\"13/10/2026 17:22\",\"Número Siniestro\":\"CAS-2468140-Y9Y3\",\"RFC Asegurado\":\"3101315660\",\"Nombre Asegurado\":\"CREDI Q LEASING SOCIEDAD ANONIMA\",\"Número Póliza/Documento\":\"0203AUT000732501\",\"Nombre Valuador\":\"Leonardo Fernández EN\",\"Aseguradora\":\"Instituto Nacional de Seguros (INSCR)\",\"Descripción\":\"HYUNDAI/GRAND I10 (AI3)/GRAND I10\",\"Armadora\":\"HYUNDAI\",\"Matricula\":\"PART-PAR-CCL540\",\"Chasis\":\"MALB251CBSM544096\",\"Año Modelo\":\"2025\",\"Año Fabricación\":\"2025\",\"KM\":\"21962\",\"Nombre Taller\":\"INS TALLER RK DE ESCAZU SA\",\"RFC\":\"3101796152INS\",\"Inscripción Estadual\":\"0\",\"País\":\"Costa Rica\",\"Estado\":\"San José\",\"Ciudad\":\"02 Escazú\",\"Codigo Postal\":\"10203\",\"Calle\":\"GUACHIPELIN, CALLE MANGO DEL TUNEL A MULTIPLAZA ESCAZU 200 METROS NORTE Y 25 METROS ESTE.\",\"Colonia\":\"SAN JOSE\",\"Nombre Contacto\":\"INS TALLER RK DE ESCAZU SA INS TALLER RK DE ESCAZU SA\",\"Teléfono\":\"22155060\",\"E-mail\":\"servicio@tallerrk.com\"}}'),
('7ohAxDWmWjQ=','Instituto Nacional de Seguros (INSCR)','21504','INS TALLER DE ENDEREZADO Y PINTURA MVC S.A.','0118AUT038308000','CAS-2467141-B9X2','PART-PAR-BGY411','HYUNDAI',NULL,NULL,'13/10/2026 16:41',0,'CERRADA','NUEVA','2026-10-17 13:23:13','2026-10-17 19:23:11','2026-10-17 19:23:11','{\"repuestos\":[],\"datosCotizacion\":{}}'),
('DBST536DUaI=','Instituto Nacional de Seguros (INSCR)','21518','INS TALLER J. FEYTH ENDEREZADO Y PINTURA S.A.','00000000','CAS-2466648-Q5Z2','PART-PAR-RJJ523','MAZDA',NULL,NULL,'13/10/2026 17:52',29,'ACTIVA','NUEVA','2026-10-17 13:23:07','2026-10-17 19:23:05','2026-10-17 19:23:05','{\"repuestos\":[],\"datosCotizacion\":{}}'),
('dpiGl+zRD0w=','Instituto Nacional de Seguros (INSCR)','21507','INS AUTOCARROCERÍA LIBERIA','0112AUT008574406','CAS-2459416-W5L3','C-PAR-135977','FREIGHTLINER',NULL,NULL,'13/10/2026 16:58',0,'CERRADA','NUEVA','2026-10-17 13:23:10','2026-10-17 19:23:08','2026-10-17 19:23:08','{\"repuestos\":[],\"datosCotizacion\":{}}'),
('dYwPI8QokcM=','Instituto Nacional de Seguros (INSCR)','21516','INS CARROCERÍA Y PINTURA HOOL','1','CAS-2461094-T2D1','PART-PAR-LKS408','NISSAN','NISSAN/QASHQAI (J11E)/BASICO','2015','13/10/2026 17:47',4,'ACTIVA','NUEVA','2026-10-17 12:59:59','2026-10-17 19:00:01','2026-10-17 19:00:01','{\"repuestos\":[{\"PartNumber\":\"261008170507631\",\"Part Serial Number\":\"261008170507631\",\"Descripcion Pieza\":\"3 PREN BUMP TRAS\"},{\"PartNumber\":\"85220 4EA0A\",\"Part Serial Number\":\"719U26326320496WANCR59100400236\",\"Descripcion Pieza\":\"SOP.D.BUMPER TRA.\"},{\"PartNumber\":\"26550 4EA6E\",\"Part Serial Number\":\"719U32849420021WANCR59100400236\",\"Descripcion Pieza\":\"STOP TR.D.INT.CPL.\"},{\"PartNumber\":\"26550 4EA0A\",\"Part Serial Number\":\"719U32829420015WANCR59100400236\",\"Descripcion Pieza\":\"STOP TR.EXT.D.CPL.\"}],\"datosCotizacion\":{\"Número Cotización\":\"21516\",\"Fecha de Creación\":\"13/10/2026 17:47\",\"Número Siniestro\":\"CAS-2461094-T2D1\",\"RFC Asegurado\":\"113430339\",\"Nombre Asegurado\":\"MARCOS GABRIEL ARISPE MARTINEZ\",\"Número Póliza/Documento\":\"1\",\"Nombre Valuador\":\"Ernesto Solano EN\",\"Aseguradora\":\"Instituto Nacional de Seguros (INSCR)\",\"Descripción\":\"NISSAN/QASHQAI (J11E)/BASICO\",\"Armadora\":\"NISSAN\",\"Matricula\":\"PART-PAR-LKS408\",\"Chasis\":\"SJNFBAJ11FA267973\",\"Año Modelo\":\"2015\",\"Año Fabricación\":\"2015\",\"KM\":\"213449\",\"Nombre Taller\":\"INS CARROCERÍA Y PINTURA HOOL\",\"RFC\":\"204000372INS\",\"Inscripción Estadual\":\"0\",\"País\":\"Costa Rica\",\"Estado\":\"Guanacaste\",\"Ciudad\":\"02 Nicoya\",\"Codigo Postal\":\"1000\",\"Calle\":\"50 ESTE DEL AYA.\",\"Colonia\":\"GUANACASTE\",\"Nombre Contacto\":\"INS LUIS GERARDO CASTRO ALPÍZAR INS LUIS GERARDO CASTRO ALPÍZAR\",\"Teléfono\":\"8749-3098\",\"E-mail\":\"carroceriaypinturahool@outlook.com\"}}'),
('Ez4gQsdkAlw=','Instituto Nacional de Seguros (INSCR)','21511','INS BAVARIAN MOTORS CR S.A','0220AUT017055901','CAS-2469471-Z2C9','PART-PAR-ADJ859','MINI',NULL,NULL,'13/10/2026 17:11',1,'ACTIVA','NUEVA','2026-10-17 13:23:10','2026-10-17 19:23:08','2026-10-17 19:23:08','{\"repuestos\":[],\"datosCotizacion\":{}}'),
('GnAr7GmbseQ=','Instituto Nacional de Seguros (INSCR)','21514','INS TALLER COTO','0116AUT032252605','CAS-2466722-F5M6','PART-PAR-867844','HONDA','HONDA/PILOT (YF3/YF4)/EX','2011','13/10/2026 17:39',2,'ACTIVA','NUEVA','2026-10-17 13:00:16','2026-10-17 19:00:19','2026-10-17 19:00:19','{\"repuestos\":[{\"PartNumber\":\"261008170434375\",\"Part Serial Number\":\"261008170434375\",\"Descripcion Pieza\":\"CALC TRANS PTA TRAS\"},{\"PartNumber\":\"42753SB8661\",\"Part Serial Number\":\"35PL95704410022WANCR51100399992\",\"Descripcion Pieza\":\"VALVULA PRESION TR.D\"}],\"datosCotizacion\":{\"Número Cotización\":\"21514\",\"Fecha de Creación\":\"13/10/2026 17:39\",\"Número Siniestro\":\"CAS-2466722-F5M6\",\"RFC Asegurado\":\"108660180\",\"Nombre Asegurado\":\"ROBERTO FEDERICO SOTO CALDERON\",\"Número Póliza/Documento\":\"0116AUT032252605\",\"Nombre Valuador\":\"Jefrey Fonseca EN\",\"Aseguradora\":\"Instituto Nacional de Seguros (INSCR)\",\"Descripción\":\"HONDA/PILOT (YF3/YF4)/EX\",\"Armadora\":\"HONDA\",\"Matricula\":\"PART-PAR-867844\",\"Chasis\":\"5FNYF4850BB601629\",\"Año Modelo\":\"2011\",\"Año Fabricación\":\"2011\",\"KM\":\"151217\",\"Nombre Taller\":\"INS TALLER COTO\",\"RFC\":\"3101203415INS\",\"Inscripción Estadual\":\"0\",\"País\":\"Costa Rica\",\"Estado\":\"San José\",\"Ciudad\":\"18 Curridabat\",\"Codigo Postal\":\"1000\",\"Calle\":\"COSTADO SUR DEL ESTADIO MUNICIPAL\",\"Colonia\":\"SAN JOSÉ\",\"Nombre Contacto\":\"INS TALLER DE CARROCERIA Y PINTURA COTO S.A. INS TALLER DE CARROCERIA Y PINTURA COTO S.A.\",\"Teléfono\":\"22725217\",\"E-mail\":\"gerencia@tallercoto.co.cr\"}}'),
('h0Nzi4oulXU=','Instituto Nacional de Seguros (INSCR)','21503','INS VETRASA','0103AUT047837702','CAS-2468594-B3P6','PART-PAR-ADX669','CHANGAN',NULL,NULL,'13/10/2026 16:33',25,'ACTIVA','NUEVA','2026-10-17 13:23:15','2026-10-17 19:23:12','2026-10-17 19:23:12','{\"repuestos\":[],\"datosCotizacion\":{}}'),
('JNfbzXEQsY4=','Instituto Nacional de Seguros (INSCR)','21501','INS TALLER BUSTAMANTE','0220AUT011647108','CAS-2465340-F0Q6','PART-PAR-KTR904','MERCEDES-BENZ','MAXUS/SUV/','2022','13/10/2026 16:25',25,'ACTIVA','NUEVA','2026-10-17 13:23:37','2026-10-17 19:23:42','2026-10-17 19:23:42','{\"repuestos\":[{\"PartNumber\":\"261001184136622\",\"Part Serial Number\":\"261001184136622\",\"Descripcion Pieza\":\"3 PREN FORRO PLS\"},{\"PartNumber\":\"261001184136606\",\"Part Serial Number\":\"261001184136606\",\"Descripcion Pieza\":\"4 PREN BUMP DEL\"},{\"PartNumber\":\"261001185254516\",\"Part Serial Number\":\"261001185254516\",\"Descripcion Pieza\":\"AIRBAG CONDUCTOR\"},{\"PartNumber\":\"261001185254346\",\"Part Serial Number\":\"261001185254346\",\"Descripcion Pieza\":\"AIRBAG PASAJERO\"},{\"PartNumber\":\"261001185254550\",\"Part Serial Number\":\"261001185254550\",\"Descripcion Pieza\":\"AISL CEN COMPAR MOT\"},{\"PartNumber\":\"261001185254435\",\"Part Serial Number\":\"261001185254435\",\"Descripcion Pieza\":\"ARO RUEDA DEL D\"},{\"PartNumber\":\"261001185254150\",\"Part Serial Number\":\"261001185254150\",\"Descripcion Pieza\":\"BUMPER DELANTERO\"},{\"PartNumber\":\"261001185254394\",\"Part Serial Number\":\"261001185254394\",\"Descripcion Pieza\":\"CINTURON SEGUR DL D\"},{\"PartNumber\":\"261001185254378\",\"Part Serial Number\":\"261001185254378\",\"Descripcion Pieza\":\"CINTURON SEGUR DL I\"},{\"PartNumber\":\"261001185254533\",\"Part Serial Number\":\"261001185254533\",\"Descripcion Pieza\":\"COB DL COMPART MOTOR\"},{\"PartNumber\":\"261001184136558\",\"Part Serial Number\":\"261001184136558\",\"Descripcion Pieza\":\"CUERDA VOLANTE\"},{\"PartNumber\":\"261001185254362\",\"Part Serial Number\":\"261001185254362\",\"Descripcion Pieza\":\"DASH\"},{\"PartNumber\":\"261001185254200\",\"Part Serial Number\":\"261001185254200\",\"Descripcion Pieza\":\"FAROL PRINCIPAL D\"},{\"PartNumber\":\"261001185254330\",\"Part Serial Number\":\"261001185254330\",\"Descripcion Pieza\":\"FORRO PLAST DL DL D\"},{\"PartNumber\":\"261001185254168\",\"Part Serial Number\":\"261001185254168\",\"Descripcion Pieza\":\"GUIA EXT D\"},{\"PartNumber\":\"261001185254467\",\"Part Serial Number\":\"261001185254467\",\"Descripcion Pieza\":\"LLANTA DEL D\"},{\"PartNumber\":\"261001185254185\",\"Part Serial Number\":\"261001185254185\",\"Descripcion Pieza\":\"PARRILLA\"},{\"PartNumber\":\"261001184136654\",\"Part Serial Number\":\"261001184136654\",\"Descripcion Pieza\":\"PREN PARRILL 2\"},{\"PartNumber\":\"261001184136638\",\"Part Serial Number\":\"261001184136638\",\"Descripcion Pieza\":\"PRNSAS FLEER 4\"},{\"PartNumber\":\"261001185254568\",\"Part Serial Number\":\"261001185254568\",\"Descripcion Pieza\":\"REGUL AIRB TENS CINT\"},{\"PartNumber\":\"261001185254500\",\"Part Serial Number\":\"261001185254500\",\"Descripcion Pieza\":\"ROTULA EXT D DIRECC\"},{\"PartNumber\":\"261001185254298\",\"Part Serial Number\":\"261001185254298\",\"Descripcion Pieza\":\"SENSOR BISAGRA DEL D\"},{\"PartNumber\":\"261001185254282\",\"Part Serial Number\":\"261001185254282\",\"Descripcion Pieza\":\"SENSOR BISAGRA DEL I\"},{\"PartNumber\":\"261001185254410\",\"Part Serial Number\":\"261001185254410\",\"Descripcion Pieza\":\"TIJERETA SP DEL D\"},{\"PartNumber\":\"261001185254450\",\"Part Serial Number\":\"261001185254450\",\"Descripcion Pieza\":\"VALV LLANTA DEL D\"}],\"datosCotizacion\":{\"Número Cotización\":\"21501\",\"Fecha de Creación\":\"13/10/2026 16:25\",\"Número Siniestro\":\"CAS-2465340-F0Q6\",\"RFC Asegurado\":\"3101083308\",\"Nombre Asegurado\":\"BAC SAN JOSE LEASING SA .\",\"Número Póliza/Documento\":\"0220AUT011647108\",\"Nombre Valuador\":\"Keilyn Rodríguez EN\",\"Aseguradora\":\"Instituto Nacional de Seguros (INSCR)\",\"Descripción\":\"MAXUS/SUV/\",\"Armadora\":\"MERCEDES-BENZ\",\"Matricula\":\"PART-PAR-KTR904\",\"Chasis\":\"LSFA431B3NA045664\",\"Año Modelo\":\"2022\",\"Año Fabricación\":\"2022\",\"KM\":\"97769\",\"Nombre Taller\":\"INS TALLER BUSTAMANTE\",\"RFC\":\"2263139INS\",\"Inscripción Estadual\":\"0\",\"País\":\"Costa Rica\",\"Estado\":\"Alajuela\",\"Ciudad\":\"10 San Carlos\",\"Codigo Postal\":\"99999\",\"Calle\":\"TALLER BUSTAMANTE, PUENTE CASA, FLORENCIA\",\"Colonia\":\"ALAJUELA\",\"Nombre Contacto\":\"INS JORGE ARTURO BUSTAMANTE SIBAJA INS JORGE ARTURO BUSTAMANTE SIBAJA\",\"Teléfono\":\"24755115\",\"E-mail\":\"info@tallerbustamantecr.com\"}}'),
('jre90SFekRQ=','Instituto Nacional de Seguros (INSCR)','21508','INS PURDY AUTO, S.A.','170426005004','CAS-2469940-H1D8','PART-PAR-BZF413','TOYOTA',NULL,NULL,'13/10/2026 17:00',7,'ACTIVA','NUEVA','2026-10-17 13:23:09','2026-10-17 19:23:07','2026-10-17 19:23:07','{\"repuestos\":[],\"datosCotizacion\":{}}'),
('K49o2oftfUg=','Instituto Nacional de Seguros (INSCR)','21502','INS TALLER MS S.A.','0104AUT024012609','CAS-2469518-Z3T7','PART-PAR-872469','TOYOTA',NULL,NULL,'13/10/2026 16:30',5,'ACTIVA','NUEVA','2026-10-17 13:23:14','2026-10-17 19:23:12','2026-10-17 19:23:12','{\"repuestos\":[],\"datosCotizacion\":{}}'),
('Kuds6HUS7Wk=','Instituto Nacional de Seguros (INSCR)','21515','INS INVERSIONES CALDERON SA','00000000','CAS-2472077-Q3M4','PART-PAR-BQQ986','HYUNDAI',NULL,NULL,'13/10/2026 17:44',0,'CERRADA','NUEVA','2026-10-17 13:23:08','2026-10-17 19:23:06','2026-10-17 19:23:06','{\"repuestos\":[],\"datosCotizacion\":{}}'),
('kvGoCqHW5TI=','Instituto Nacional de Seguros (INSCR)','21498','INS ENDEREZADO Y PINTURA CASTRO','0116AUT033189803','CAS-2472552-D6N9','PART-PAR-JVR016','HYUNDAI',NULL,NULL,'13/10/2026 16:12',7,'ACTIVA','NUEVA','2026-10-17 13:23:16','2026-10-17 19:23:13','2026-10-17 19:23:13','{\"repuestos\":[],\"datosCotizacion\":{}}'),
('o7SxNZdyWv0=','Instituto Nacional de Seguros (INSCR)','21505','INS 3B PEREZ ZELEDON','0111AUT006678504','CAS-2469000-L9F2','PART-PAR-BVB667','TOYOTA',NULL,NULL,'13/10/2026 16:57',8,'ACTIVA','NUEVA','2026-10-17 13:23:12','2026-10-17 19:23:10','2026-10-17 19:23:10','{\"repuestos\":[],\"datosCotizacion\":{}}'),
('OqhAO3zHink=','Instituto Nacional de Seguros (INSCR)','21513','INS BAVARIAN MOTORS CR S.A','0212AUT000795601','CAS-2464427-N9F2','PART-PAR-LFM202','BMW','BMW/IX1 (U11) BEV/XDRIVE30','2025','13/10/2026 17:35',6,'ACTIVA','NUEVA','2026-10-17 13:00:22','2026-10-17 19:00:24','2026-10-17 19:00:24','{\"repuestos\":[{\"PartNumber\":\"261012103523614\",\"Part Serial Number\":\"261012103523614\",\"Descripcion Pieza\":\"1 TUBO PEGAM PARABRI\"},{\"PartNumber\":\"261012103523579\",\"Part Serial Number\":\"261012103523579\",\"Descripcion Pieza\":\"2 INSONOR INF PARABR\"},{\"PartNumber\":\"261012103523599\",\"Part Serial Number\":\"261012103523599\",\"Descripcion Pieza\":\"6 TOPES DE HULE\"},{\"PartNumber\":\"51 31 9 478 740\",\"Part Serial Number\":\"11S14236410150WANCR19100400762\",\"Descripcion Pieza\":\"COB.VIDRIO PARAB.\"},{\"PartNumber\":\"261013172514972\",\"Part Serial Number\":\"261013172514972\",\"Descripcion Pieza\":\"PARABRISAS DELANTERO\"},{\"PartNumber\":\"61 35 9 856 157\",\"Part Serial Number\":\"11S14489210054WANCR19100400762\",\"Descripcion Pieza\":\"SILICON SENS.LLUVIA\"}],\"datosCotizacion\":{\"Número Cotización\":\"21513\",\"Fecha de Creación\":\"13/10/2026 17:35\",\"Número Siniestro\":\"CAS-2464427-N9F2\",\"RFC Asegurado\":\"3101692430\",\"Nombre Asegurado\":\"DAVIVIENDA LEASING COSTA RICA S.A.\",\"Número Póliza/Documento\":\"0212AUT000795601\",\"Nombre Valuador\":\"Deysler Solano EN\",\"Aseguradora\":\"Instituto Nacional de Seguros (INSCR)\",\"Descripción\":\"BMW/IX1 (U11) BEV/XDRIVE30\",\"Armadora\":\"BMW\",\"Matricula\":\"PART-PAR-LFM202\",\"Chasis\":\"WBY61EF06S5045895\",\"Año Modelo\":\"2025\",\"Año Fabricación\":\"2025\",\"KM\":\"17479\",\"Nombre Taller\":\"INS BAVARIAN MOTORS CR S.A\",\"RFC\":\"3101501521INS\",\"Inscripción Estadual\":\"0\",\"País\":\"Costa Rica\",\"Estado\":\"San José\",\"Ciudad\":\"01 San José\",\"Codigo Postal\":\"1000\",\"Calle\":\"COSTADO SUR DE LA ESTACION DE SERVICIO DELTA\",\"Colonia\":\"SAN JOSE\",\"Nombre Contacto\":\"INS BAVARIAN MOTORS CR S.A INS BAVARIAN MOTORS CR S.A\",\"Teléfono\":\"25475000\",\"E-mail\":\"evindas@redmotorscr.com\"}}'),
('qGALoHRgdyQ=','Instituto Nacional de Seguros (INSCR)','21506','INS JULIO CESAR LEDEZMA CASTILLO SUCURSAL LA GARITA','00000000','CAS-2472309-B6P7','PART-PAR-BPC439','TOYOTA',NULL,NULL,'13/10/2026 16:57',4,'ACTIVA','NUEVA','2026-10-17 13:23:12','2026-10-17 19:23:10','2026-10-17 19:23:10','{\"repuestos\":[],\"datosCotizacion\":{}}'),
('tmOI8AoUmZo=','Instituto Nacional de Seguros (INSCR)','21497','INS BAVARIAN MOTORS CR S.A','0119AUT031219401','CAS-2457735-W4N7','PART-PAR-MLS250','MINI',NULL,NULL,'13/10/2026 16:09',3,'ACTIVA','NUEVA','2026-10-17 13:23:16','2026-10-17 19:23:14','2026-10-17 19:23:14','{\"repuestos\":[],\"datosCotizacion\":{}}'),
('YFowABdY98M=','Instituto Nacional de Seguros (INSCR)','21520','INS JULIO CESAR LEDEZMA CASTILLO SUCURSAL LA GARITA','0220AUT016885002','CAS-2470721-S0G2','PART-PAR-TBY108','GEELY','GEELY/GEOMETRY C/*SUV 4 P 2WD 2024','2024','13/10/2026 18:40',16,'ACTIVA','NUEVA','2026-10-17 12:59:37','2026-10-17 18:59:38','2026-10-17 18:59:38','{\"repuestos\":[{\"PartNumber\":\"261006181110975\",\"Part Serial Number\":\"261006181110975\",\"Descripcion Pieza\":\"4 PRENSA BUMPER DEL\"},{\"PartNumber\":\"261006181110983\",\"Part Serial Number\":\"261006181110983\",\"Descripcion Pieza\":\"6 PRENSA FORRO PLAST\"},{\"PartNumber\":\"261006181111144\",\"Part Serial Number\":\"261006181111144\",\"Descripcion Pieza\":\"BISAGRA D TAPA MOTOR\"},{\"PartNumber\":\"261006181111152\",\"Part Serial Number\":\"261006181111152\",\"Descripcion Pieza\":\"BISAGRA I TAPA MOTOR\"},{\"PartNumber\":\"261006181111035\",\"Part Serial Number\":\"261006181111035\",\"Descripcion Pieza\":\"CALCA AVISO ABANICO\"},{\"PartNumber\":\"261006181111169\",\"Part Serial Number\":\"261006181111169\",\"Descripcion Pieza\":\"CANALIZ VENTILADOR\"},{\"PartNumber\":\"261006181111000\",\"Part Serial Number\":\"261006181111000\",\"Descripcion Pieza\":\"ESTEREOFON BUMP DEL\"},{\"PartNumber\":\"261006181111009\",\"Part Serial Number\":\"261006181111009\",\"Descripcion Pieza\":\"FAROL CENTRAL FRONT\"},{\"PartNumber\":\"261006181111160\",\"Part Serial Number\":\"261006181111160\",\"Descripcion Pieza\":\"MARCO PROT RADIADOR\"},{\"PartNumber\":\"261006181111018\",\"Part Serial Number\":\"261006181111018\",\"Descripcion Pieza\":\"MOLD SUP DEL FRENTE\"},{\"PartNumber\":\"261006181111102\",\"Part Serial Number\":\"261006181111102\",\"Descripcion Pieza\":\"REF BUMPER DEL\"},{\"PartNumber\":\"261006181111068\",\"Part Serial Number\":\"261006181111068\",\"Descripcion Pieza\":\"REJIL INF BUMPER DL\"},{\"PartNumber\":\"261006181111094\",\"Part Serial Number\":\"261006181111094\",\"Descripcion Pieza\":\"SOP CEN BUMPER DEL\"},{\"PartNumber\":\"261006181111177\",\"Part Serial Number\":\"261006181111177\",\"Descripcion Pieza\":\"SOP CEN D BUMPER DL\"},{\"PartNumber\":\"261006181111186\",\"Part Serial Number\":\"261006181111186\",\"Descripcion Pieza\":\"SOP CEN I BUMPER DL\"},{\"PartNumber\":\"261006181111135\",\"Part Serial Number\":\"261006181111135\",\"Descripcion Pieza\":\"TAPA MOTOR\"}],\"datosCotizacion\":{\"Número Cotización\":\"21520\",\"Fecha de Creación\":\"13/10/2026 18:40\",\"Número Siniestro\":\"CAS-2470721-S0G2\",\"RFC Asegurado\":\"205800758\",\"Nombre Asegurado\":\"OMAR ROBERTO CHACON GAMBOA\",\"Número Póliza/Documento\":\"0220AUT016885002\",\"Nombre Valuador\":\"Esteban Salgado EN\",\"Aseguradora\":\"Instituto Nacional de Seguros (INSCR)\",\"Descripción\":\"GEELY/GEOMETRY C/*SUV 4 P 2WD 2024\",\"Armadora\":\"GEELY\",\"Matricula\":\"PART-PAR-TBY108\",\"Chasis\":\"LB377U2W5RA101583\",\"Año Modelo\":\"2024\",\"Año Fabricación\":\"2024\",\"KM\":\"30941\",\"Nombre Taller\":\"INS JULIO CESAR LEDEZMA CASTILLO SUCURSAL LA GARITA\",\"RFC\":\"1071108062INS\",\"Inscripción Estadual\":\"0\",\"País\":\"Costa Rica\",\"Estado\":\"Alajuela\",\"Ciudad\":\"01 Alajuela\",\"Codigo Postal\":\"1000\",\"Calle\":\"2KM SUR DE LA ESCUELA GARITA DE ALAJUELA.\",\"Colonia\":\"ALAJUELA\",\"Nombre Contacto\":\"INS JULIO CESAR LEDEZMA CASTILLO SUCURSAL LA INS JULIO CESAR LEDEZMA CASTILLO SUCURSAL LA\",\"Teléfono\":\"2487-5234\",\"E-mail\":\"gerencia@technocrashcr.com\"}}'),
('YsL0+VZnhYw=','Instituto Nacional de Seguros (INSCR)','21519','INS BAVARIAN MOTORS CR S.A','00000000','CAS-2465962-Z3C0-2','PART-PAR-MLY520','BMW','BMW/X1 (U11)/SDRIVE18I','2023','13/10/2026 18:11',35,'ACTIVA','NUEVA','2026-10-17 13:01:02','2026-10-17 19:01:04','2026-10-17 19:01:04','{\"repuestos\":[{\"PartNumber\":\"261013175524599\",\"Part Serial Number\":\"261013175524599\",\"Descripcion Pieza\":\"1 TUB PEGAMENT VIDRI\"},{\"PartNumber\":\"261006185529117\",\"Part Serial Number\":\"261006185529117\",\"Descripcion Pieza\":\"12 REMACH MOLD PASAR\"},{\"PartNumber\":\"261006185529086\",\"Part Serial Number\":\"261006185529086\",\"Descripcion Pieza\":\"2 CINTA VELCRO\"},{\"PartNumber\":\"261006185529101\",\"Part Serial Number\":\"261006185529101\",\"Descripcion Pieza\":\"2 TOPE DE HULE\"},{\"PartNumber\":\"261006185529164\",\"Part Serial Number\":\"261006185529164\",\"Descripcion Pieza\":\"3 TORN BUMPER TRAS\"},{\"PartNumber\":\"261006185529149\",\"Part Serial Number\":\"261006185529149\",\"Descripcion Pieza\":\"3 TUERCA PLAST BUMPE\"},{\"PartNumber\":\"261007102219390\",\"Part Serial Number\":\"261007102219390\",\"Descripcion Pieza\":\"30 REMACHE N4\"},{\"PartNumber\":\"261006185529133\",\"Part Serial Number\":\"261006185529133\",\"Descripcion Pieza\":\"4 REMACHE BUMPER TRA\"},{\"PartNumber\":\"261007102219406\",\"Part Serial Number\":\"261007102219406\",\"Descripcion Pieza\":\"4 TORN SF PLUS\"},{\"PartNumber\":\"261007102219374\",\"Part Serial Number\":\"261007102219374\",\"Descripcion Pieza\":\"50 REMACHE N3\"},{\"PartNumber\":\"261006185528932\",\"Part Serial Number\":\"261006185528932\",\"Descripcion Pieza\":\"6 REMACH M6 TUERCA\"},{\"PartNumber\":\"18 30 7 560 778\",\"Part Serial Number\":\"11S50372620040WANCR60100399442\",\"Descripcion Pieza\":\"ABRAZ.SILENCI.TRA.\"},{\"PartNumber\":\"51 12 9 883 537\",\"Part Serial Number\":\"11S26266320498WANCR60100399442\",\"Descripcion Pieza\":\"ABSORB.IMPACTO TRA.\"},{\"PartNumber\":\"51 48 9 465 692\",\"Part Serial Number\":\"11S88502620035WANCR60100399442\",\"Descripcion Pieza\":\"AISLANTE TERMICO TR.\"},{\"PartNumber\":\"261007095502569\",\"Part Serial Number\":\"261007095502569\",\"Descripcion Pieza\":\"ANTENA INF SMO\"},{\"PartNumber\":\"261007095502554\",\"Part Serial Number\":\"261007095502554\",\"Descripcion Pieza\":\"ANTENA SUP SMO\"},{\"PartNumber\":\"51 12 5 A4F FD1\",\"Part Serial Number\":\"11S25836320500WANCR60100399442\",\"Descripcion Pieza\":\"BUMPER TRASERO\"},{\"PartNumber\":\"51 12 9 883 528\",\"Part Serial Number\":\"11S26136320550WANCR60100399442\",\"Descripcion Pieza\":\"COB.GANCHO REMOL.TRA\"},{\"PartNumber\":\"51 12 5 A5A EF7\",\"Part Serial Number\":\"11S25856320515WANCR60100399442\",\"Descripcion Pieza\":\"COBER.INF.BUMPER TR.\"},{\"PartNumber\":\"51 14 9 450 493\",\"Part Serial Number\":\"11S30216630015WANCR60100399442\",\"Descripcion Pieza\":\"EMBLEMA TRA.\"},{\"PartNumber\":\"51 14 9 450 486\",\"Part Serial Number\":\"11S30206630016WANCR60100399442\",\"Descripcion Pieza\":\"EMBLEMA TRA.D.INF.\"},{\"PartNumber\":\"51 76 9 450 461\",\"Part Serial Number\":\"11S29445530013WANCR60100399442\",\"Descripcion Pieza\":\"EMPAQUE TAPA TRASERA\"},{\"PartNumber\":\"63 21 9 465 354\",\"Part Serial Number\":\"11S32849420021WANCR60100399442\",\"Descripcion Pieza\":\"FAROL STOP TR.D.INT.\"},{\"PartNumber\":\"63 21 9 465 353\",\"Part Serial Number\":\"11S32839420021WANCR60100399442\",\"Descripcion Pieza\":\"FAROL STOP TR.I.INT.\"},{\"PartNumber\":\"63 21 9 465 350\",\"Part Serial Number\":\"11S32829420015WANCR60100399442\",\"Descripcion Pieza\":\"FAROL STOP TRA.D.\"},{\"PartNumber\":\"261007102219358\",\"Part Serial Number\":\"261007102219358\",\"Descripcion Pieza\":\"MASILLA SELLADO D2\"},{\"PartNumber\":\"51 12 9 883 527\",\"Part Serial Number\":\"11S26476320521WANCR60100399442\",\"Descripcion Pieza\":\"MOLD.INF.BUMPER TRA.\"},{\"PartNumber\":\"51 12 9 883 530\",\"Part Serial Number\":\"11S25946320515WANCR60100399442\",\"Descripcion Pieza\":\"MOLD.PUNT.D.BUMP.TR\"},{\"PartNumber\":\"261006185528975\",\"Part Serial Number\":\"261006185528975\",\"Descripcion Pieza\":\"PEGAMENTO K5\"},{\"PartNumber\":\"41 00 9 622 286\",\"Part Serial Number\":\"11S27125320030WANCR60100399442\",\"Descripcion Pieza\":\"QUICIO BAUL\"},{\"PartNumber\":\"41 00 9 622 283\",\"Part Serial Number\":\"11S27115320020WANCR60100399442\",\"Descripcion Pieza\":\"QUICIO BAUL EXT.\"},{\"PartNumber\":\"18 30 8 639 503\",\"Part Serial Number\":\"11S88332620030WANCR60100399442\",\"Descripcion Pieza\":\"SILENCIADOR ESCAPE\"},{\"PartNumber\":\"51 12 9 883 546\",\"Part Serial Number\":\"11S26436320495WANCR60100399442\",\"Descripcion Pieza\":\"SOP.BUMPER TRA.\"},{\"PartNumber\":\"51 12 9 883 545\",\"Part Serial Number\":\"11S26256320496WANCR60100399442\",\"Descripcion Pieza\":\"SOP.SMART OPENER\"},{\"PartNumber\":\"41 62 9 450 465\",\"Part Serial Number\":\"11S29315530010WANCR60100399442\",\"Descripcion Pieza\":\"TAPA TRASERA\"}],\"datosCotizacion\":{\"Número Cotización\":\"21519\",\"Fecha de Creación\":\"13/10/2026 18:11\",\"Número Siniestro\":\"CAS-2465962-Z3C0-2\",\"RFC Asegurado\":\"104040636\",\"Nombre Asegurado\":\"AUDREY AMADOR VARGAS\",\"Número Póliza/Documento\":\"00000000\",\"Nombre Valuador\":\"Jose Valverde EN\",\"Aseguradora\":\"Instituto Nacional de Seguros (INSCR)\",\"Descripción\":\"BMW/X1 (U11)/SDRIVE18I\",\"Armadora\":\"BMW\",\"Matricula\":\"PART-PAR-MLY520\",\"Chasis\":\"WBA21EE09P5V80905\",\"Año Modelo\":\"2023\",\"Año Fabricación\":\"2023\",\"KM\":\"18955\",\"Nombre Taller\":\"INS BAVARIAN MOTORS CR S.A\",\"RFC\":\"3101501521INS\",\"Inscripción Estadual\":\"0\",\"País\":\"Costa Rica\",\"Estado\":\"San José\",\"Ciudad\":\"01 San José\",\"Codigo Postal\":\"1000\",\"Calle\":\"COSTADO SUR DE LA ESTACION DE SERVICIO DELTA\",\"Colonia\":\"SAN JOSE\",\"Nombre Contacto\":\"INS BAVARIAN MOTORS CR S.A INS BAVARIAN MOTORS CR S.A\",\"Teléfono\":\"25475000\",\"E-mail\":\"evindas@redmotorscr.com\"}}');
/*!40000 ALTER TABLE `audatex_oportunidades_sync` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `audatex_pedido_items`
--

LOCK TABLES `audatex_pedido_items` WRITE;
/*!40000 ALTER TABLE `audatex_pedido_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `audatex_pedido_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `audatex_pedidos`
--

LOCK TABLES `audatex_pedidos` WRITE;
/*!40000 ALTER TABLE `audatex_pedidos` DISABLE KEYS */;
/*!40000 ALTER TABLE `audatex_pedidos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `empleados`
--

LOCK TABLES `empleados` WRITE;
/*!40000 ALTER TABLE `empleados` DISABLE KEYS */;
INSERT INTO `empleados` (`id`, `nombre`, `activo`, `fecha_creacion`) VALUES (1,'ACXEL',1,'2026-10-17 18:56:06'),
(2,'ADRIANA',1,'2026-10-17 18:56:06'),
(3,'AMAURIS',1,'2026-10-17 18:56:06'),
(4,'CACHORRO',1,'2026-10-17 18:56:06'),
(5,'DIEGO',1,'2026-10-17 18:56:06'),
(6,'JHONATHAN',1,'2026-10-17 18:56:06'),
(7,'LUIS MIRANDA',1,'2026-10-17 18:56:06'),
(8,'NALLELY',1,'2026-10-17 18:56:06'),
(9,'VICTORIA',1,'2026-10-17 18:56:06');
/*!40000 ALTER TABLE `empleados` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `generaciones`
--

LOCK TABLES `generaciones` WRITE;
/*!40000 ALTER TABLE `generaciones` DISABLE KEYS */;
INSERT INTO `generaciones` (`id`, `modelo_id`, `nombre`, `descripcion`, `anio_inicio`, `anio_fin`, `total_inversion`, `total_ingresos`, `total_egresos`, `balance_neto`, `activo`, `fecha_creacion`) VALUES (1,1,'gen12','Duodécima generación E210',2020,2024,10150000.00,12110000.00,70000.00,1890000.00,1,'2026-10-17 18:56:06'),
(2,2,'gen10','Décima generación FC/FK',2016,2021,6120000.00,1940000.00,85000.00,-4265000.00,1,'2026-10-17 18:56:06'),
(3,3,'gen8','Octava generación Hilux',2016,2023,8135000.00,10900000.00,850000.00,1915000.00,1,'2026-10-17 18:56:06');
/*!40000 ALTER TABLE `generaciones` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `historial_repuestos`
--

LOCK TABLES `historial_repuestos` WRITE;
/*!40000 ALTER TABLE `historial_repuestos` DISABLE KEYS */;
INSERT INTO `historial_repuestos` (`id`, `repuesto_id`, `accion`, `campo_modificado`, `valor_anterior`, `valor_nuevo`, `usuario`, `fecha_cambio`, `ip_usuario`, `observaciones`) VALUES (1,1,'UPDATE','estado','STOCK','VENDIDO','root@localhost','2026-10-17 18:56:06',NULL,NULL),
(2,2,'UPDATE','estado','STOCK','VENDIDO','root@localhost','2026-10-17 18:56:06',NULL,NULL),
(3,3,'UPDATE','estado','STOCK','VENDIDO','root@localhost','2026-10-17 18:56:06',NULL,NULL);
/*!40000 ALTER TABLE `historial_repuestos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `historial_transacciones`
--

LOCK TABLES `historial_transacciones` WRITE;
/*!40000 ALTER TABLE `historial_transacciones` DISABLE KEYS */;
/*!40000 ALTER TABLE `historial_transacciones` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `historial_vehiculos`
--

LOCK TABLES `historial_vehiculos` WRITE;
/*!40000 ALTER TABLE `historial_vehiculos` DISABLE KEYS */;
INSERT INTO `historial_vehiculos` (`id`, `vehiculo_id`, `accion`, `campo_modificado`, `valor_anterior`, `valor_nuevo`, `usuario`, `fecha_cambio`, `ip_usuario`, `observaciones`) VALUES (1,1,'UPDATE','estado','DISPONIBLE','VENDIDO','root@localhost','2026-10-17 18:56:06',NULL,'El estado del vehículo cambió de \"DISPONIBLE\" a \"VENDIDO\"'),
(2,1,'UPDATE','precio_venta',NULL,'12000000.00','root@localhost','2026-10-17 18:56:06',NULL,'El precio de venta fue modificado de sin precio a ₡12000000.00'),
(3,1,'UPDATE','estado','DISPONIBLE','VENDIDO','root@localhost','2026-10-17 18:56:06',NULL,'Cambio automático por trigger de venta'),
(4,3,'UPDATE','estado','REPARACION','DISPONIBLE','root@localhost','2026-10-17 18:56:06',NULL,'El estado del vehículo cambió de \"REPARACION\" a \"DISPONIBLE\"'),
(5,3,'UPDATE','estado','DISPONIBLE','VENDIDO','root@localhost','2026-10-17 18:56:06',NULL,'El estado del vehículo cambió de \"DISPONIBLE\" a \"VENDIDO\"'),
(6,3,'UPDATE','precio_venta',NULL,'10900000.00','root@localhost','2026-10-17 18:56:06',NULL,'El precio de venta fue modificado de sin precio a ₡10900000.00'),
(7,3,'UPDATE','estado','DISPONIBLE','VENDIDO','root@localhost','2026-10-17 18:56:06',NULL,'Cambio automático por trigger de venta');
/*!40000 ALTER TABLE `historial_vehiculos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `inventario_repuestos`
--

LOCK TABLES `inventario_repuestos` WRITE;
/*!40000 ALTER TABLE `inventario_repuestos` DISABLE KEYS */;
INSERT INTO `inventario_repuestos` (`id`, `codigo_repuesto`, `parte_Vehiculo_id`, `vehiculo_origen_id`, `generacion_id`, `anio_registro`, `mes_registro`, `codigo_ubicacion`, `imagen_url`, `descripcion`, `precio_costo`, `precio_venta`, `precio_mayoreo`, `formula_15`, `formula_30`, `bodega`, `zona`, `pared`, `malla`, `horizontal`, `estante`, `nivel`, `piso`, `plastica`, `carton`, `posicion`, `cantidad`, `estado`, `condicion`, `fecha_creacion`, `fecha_actualizacion`, `activo`) VALUES (1,'REP-Honda-2016-2021-0001',1,2,NULL,2026,10,'C--Z1--PE--V5-E1-P2-','https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=400&q=80','Motor 1.5 L Turbo VTEC',1200000.00,1800000.00,1500000.00,1380000.00,1560000.00,'C-','Z1-','PE-','V5','0-','E1','0-','P2-',NULL,NULL,NULL,0,'VENDIDO','50%-','2026-10-17 00:00:00','2026-10-17 18:56:06',1),
(2,'REP-Toyota-2020-2024-0001',15,NULL,1,2026,10,'R--Z2--PN--V10-E2-P3-','https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?w=400&q=80','Bomba de agua OEM Toyota Corolla',70000.00,110000.00,95000.00,80500.00,91000.00,'R-','Z2-','PN-','V10','0-','E2','0-','P3-',NULL,NULL,NULL,0,'VENDIDO','100%-','2026-10-17 18:56:06','2026-10-17 18:56:06',1),
(3,'REP-Honda-2016-2021-0002',9,NULL,2,2026,10,'R--Z3--PS--V12-E3-P3-','https://images.unsplash.com/photo-1579208030886-b937da0925dc?w=400&q=80','Kit embrague original Honda Civic',85000.00,140000.00,120000.00,97750.00,110500.00,'R-','Z3-','PS-','V12','0-','E3','0-','P3-',NULL,NULL,NULL,0,'VENDIDO','100%-','2026-10-17 18:56:06','2026-10-17 18:56:06',1);
/*!40000 ALTER TABLE `inventario_repuestos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `marcas`
--

LOCK TABLES `marcas` WRITE;
/*!40000 ALTER TABLE `marcas` DISABLE KEYS */;
INSERT INTO `marcas` (`id`, `nombre`, `activo`, `fecha_creacion`) VALUES (1,'Toyota',1,'2026-10-17 18:56:06'),
(2,'Honda',1,'2026-10-17 18:56:06');
/*!40000 ALTER TABLE `marcas` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `modelos`
--

LOCK TABLES `modelos` WRITE;
/*!40000 ALTER TABLE `modelos` DISABLE KEYS */;
INSERT INTO `modelos` (`id`, `marca_id`, `nombre`, `activo`, `fecha_creacion`) VALUES (1,1,'Corolla',1,'2026-10-17 18:56:06'),
(2,2,'Civic',1,'2026-10-17 18:56:06'),
(3,1,'Hilux',1,'2026-10-17 18:56:06');
/*!40000 ALTER TABLE `modelos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `modulos`
--

LOCK TABLES `modulos` WRITE;
/*!40000 ALTER TABLE `modulos` DISABLE KEYS */;
INSERT INTO `modulos` (`id`, `nombre`, `clave`, `icono`) VALUES (1,'Inicio','inicio','HomeOutlined'),
(2,'Vehículos','vehiculos','CarOutlined'),
(3,'Inventario','inventario','ToolOutlined'),
(4,'Finanzas','finanzas','DollarOutlined'),
(5,'Reportes','reportes','BarChartOutlined'),
(6,'Cotizaciones InPart','audatex','SendOutlined'),
(7,'Configuración','configuracion','SettingOutlined');
/*!40000 ALTER TABLE `modulos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `pagos_comisiones`
--

LOCK TABLES `pagos_comisiones` WRITE;
/*!40000 ALTER TABLE `pagos_comisiones` DISABLE KEYS */;
/*!40000 ALTER TABLE `pagos_comisiones` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `parte_vehiculo`
--

LOCK TABLES `parte_vehiculo` WRITE;
/*!40000 ALTER TABLE `parte_vehiculo` DISABLE KEYS */;
INSERT INTO `parte_vehiculo` (`id`, `nombre`, `activo`, `fecha_creacion`) VALUES (1,'MOTOR',1,'2026-10-17 18:56:04'),
(2,'CHASIS',1,'2026-10-17 18:56:04'),
(3,'CARROCERIA',1,'2026-10-17 18:56:04'),
(4,'COMPUTADORA',1,'2026-10-17 18:56:04'),
(5,'CAJA DE CAMBIO',1,'2026-10-17 18:56:04'),
(6,'AIRBAGS O BOLSAS DE AIRE',1,'2026-10-17 18:56:04'),
(7,'EJES Y DIFERENCIA',1,'2026-10-17 18:56:04'),
(8,'SUSPENSION Y AMORTIGUAMIENTO',1,'2026-10-17 18:56:04'),
(9,'EMBRAGUE',1,'2026-10-17 18:56:04'),
(10,'SISTEMA DE FRENOS',1,'2026-10-17 18:56:04'),
(11,'TANQUE DE GASOLINA',1,'2026-10-17 18:56:04'),
(12,'DISTRIBUIDOR',1,'2026-10-17 18:56:04'),
(13,'RADIADOR',1,'2026-10-17 18:56:04'),
(14,'VENTILADOR',1,'2026-10-17 18:56:04'),
(15,'BOMBA DE AGUA',1,'2026-10-17 18:56:04'),
(16,'BATERIA',1,'2026-10-17 18:56:04'),
(17,'AROS Y LLANTAS',1,'2026-10-17 18:56:04'),
(18,'SISTEMA DE DIRECCION',1,'2026-10-17 18:56:04'),
(19,'SISTEMA ELECTRICO',1,'2026-10-17 18:56:04'),
(20,'FUSIBLES',1,'2026-10-17 18:56:04'),
(21,'ALTERNADOR',1,'2026-10-17 18:56:04'),
(22,'VÁLVULAS DE ESCAPE',1,'2026-10-17 18:56:04'),
(23,'TURBO',1,'2026-10-17 18:56:04');
/*!40000 ALTER TABLE `parte_vehiculo` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `personal_data`
--

LOCK TABLES `personal_data` WRITE;
/*!40000 ALTER TABLE `personal_data` DISABLE KEYS */;
INSERT INTO `personal_data` (`user_id`, `full_name`) VALUES (1,'Administrador del Sistema'),
(2,'Contador'),
(3,'Colaborador');
/*!40000 ALTER TABLE `personal_data` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `phones`
--

LOCK TABLES `phones` WRITE;
/*!40000 ALTER TABLE `phones` DISABLE KEYS */;
INSERT INTO `phones` (`user_id`, `whatsapp`, `other_numbers`) VALUES (1,NULL,NULL),
(2,NULL,NULL),
(3,NULL,NULL);
/*!40000 ALTER TABLE `phones` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `rol_permisos`
--

LOCK TABLES `rol_permisos` WRITE;
/*!40000 ALTER TABLE `rol_permisos` DISABLE KEYS */;
INSERT INTO `rol_permisos` (`id`, `rol_id`, `submodulo_id`, `can_view`, `can_create`, `can_edit`, `can_delete`) VALUES (1,1,1,1,1,1,1),
(2,1,2,1,1,1,1),
(3,1,3,1,1,1,1),
(4,1,4,1,1,1,1),
(5,1,5,1,1,1,1),
(6,1,6,1,1,1,1),
(7,1,7,1,1,1,1),
(8,1,8,1,1,1,1),
(9,1,9,1,1,1,1),
(10,1,10,1,1,1,1),
(11,1,11,1,1,1,1),
(12,1,12,1,1,1,1),
(16,2,5,1,0,0,0),
(17,2,1,1,0,0,0),
(18,2,4,1,0,0,0),
(19,2,6,1,0,0,0),
(20,2,2,1,0,0,0),
(23,3,5,1,0,0,0),
(24,3,1,1,0,0,0),
(25,3,4,1,0,0,0),
(26,3,6,1,0,0,0),
(27,3,2,1,0,0,0);
/*!40000 ALTER TABLE `rol_permisos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `roles`
--

LOCK TABLES `roles` WRITE;
/*!40000 ALTER TABLE `roles` DISABLE KEYS */;
INSERT INTO `roles` (`id`, `nombre`) VALUES (1,'ADMIN'),
(3,'COLABORADOR'),
(2,'CONTADOR');
/*!40000 ALTER TABLE `roles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `submodulos`
--

LOCK TABLES `submodulos` WRITE;
/*!40000 ALTER TABLE `submodulos` DISABLE KEYS */;
INSERT INTO `submodulos` (`id`, `modulo_id`, `nombre`, `clave`) VALUES (1,1,'Dashboard','inicio_dashboard'),
(2,2,'Lista de Vehículos','vehiculos_lista'),
(3,2,'Generaciones','vehiculos_jerarquia'),
(4,3,'Lista de Repuestos','inventario_lista'),
(5,4,'Transacciones','finanzas_lista'),
(6,5,'Reporte General','reportes_general'),
(7,5,'Ventas Empleados','reportes_ventas'),
(8,5,'Reportes Vehículos','reportes_vehiculos'),
(9,5,'Reportes Repuestos','reportes_repuestos'),
(10,6,'Oportunidades','audatex_oportunidades'),
(11,6,'Pedidos','audatex_pedidos'),
(12,7,'Ajustes de Privacidad','configuracion_ajustes');
/*!40000 ALTER TABLE `submodulos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `tipos_transacciones`
--

LOCK TABLES `tipos_transacciones` WRITE;
/*!40000 ALTER TABLE `tipos_transacciones` DISABLE KEYS */;
INSERT INTO `tipos_transacciones` (`id`, `nombre`, `descripcion`, `categoria`, `activo`) VALUES (1,'Venta Vehículo','Ingreso por venta de vehículo completo','INGRESO',1),
(2,'Venta Repuesto','Ingreso por venta de repuesto individual','INGRESO',1),
(3,'Venta Mayoreo','Ingreso por venta al mayoreo','INGRESO',1),
(4,'Servicios Mecánicos','Ingreso por servicios de mecánica','INGRESO',1),
(5,'Alquiler Espacio','Ingreso por alquiler de espacio en yonke','INGRESO',1),
(6,'Compra Vehículo','Egreso por compra de vehículo','EGRESO',1),
(7,'Compra Repuesto','Egreso por compra de repuesto','EGRESO',1),
(8,'Reparación Vehículo','Egreso por reparaciones de vehículo','EGRESO',1),
(9,'Mantenimiento Local','Egreso por mantenimiento del local','EGRESO',1),
(10,'Comisión Vendedor','Egreso por comisión a vendedor','EGRESO',1),
(11,'Costo Grúa','Egreso por servicio de grúa','EGRESO',1),
(12,'Transporte','Egreso por transporte de vehículos','EGRESO',1),
(13,'Combustible','Egreso por combustible','EGRESO',1),
(14,'Servicios Públicos','Egreso por electricidad, agua, teléfono','EGRESO',1),
(15,'Impuestos','Egreso por impuestos y patentes','EGRESO',1),
(16,'Salarios','Egreso por planillas y cargas sociales','EGRESO',1),
(17,'Otros Ingresos','Otros ingresos diversos','INGRESO',1),
(18,'Otros Egresos','Otros egresos diversos','EGRESO',1);
/*!40000 ALTER TABLE `tipos_transacciones` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `transacciones_financieras`
--

LOCK TABLES `transacciones_financieras` WRITE;
/*!40000 ALTER TABLE `transacciones_financieras` DISABLE KEYS */;
INSERT INTO `transacciones_financieras` (`id`, `codigo_transaccion`, `fecha`, `dia`, `mes`, `anio`, `tipo_transaccion_id`, `empleado_id`, `vehiculo_id`, `repuesto_id`, `generacion_id`, `cantidad_repuesto`, `monto`, `comision_empleado`, `descripcion`, `referencia`, `estado`, `activo`, `fecha_creacion`, `fecha_actualizacion`) VALUES (1,'TRX-202610-0001','2026-10-17',17,10,2026,6,NULL,1,NULL,1,1,10150000.00,0.00,'Compra automática de vehículo TOCO-001','AUTO-COMPRA-1','COMPLETADA',1,'2026-10-17 18:56:06','2026-10-17 18:56:06'),
(2,'TRX-202610-0002','2026-10-17',17,10,2026,6,NULL,2,NULL,2,1,6120000.00,0.00,'Compra automática de vehículo HOCI-001','AUTO-COMPRA-2','COMPLETADA',1,'2026-10-17 18:56:06','2026-10-17 18:56:06'),
(3,'TRX-202610-0003','2026-10-17',17,10,2026,2,1,NULL,1,2,1,1800000.00,25000.00,'Venta Motor Civic 1.5L Turbo','VENTA-REP-001','COMPLETADA',1,'2026-10-17 18:56:06','2026-10-17 18:56:06'),
(4,'TRX-202610-0004','2026-10-17',17,10,2026,1,2,1,NULL,1,1,12000000.00,60000.00,'Venta Toyota Corolla 2023','VENTA-COROLLA-001','COMPLETADA',1,'2026-10-17 18:56:06','2026-10-17 18:56:06'),
(5,'TRX-202610-0005','2026-10-17',17,10,2026,6,NULL,3,NULL,3,1,8135000.00,0.00,'Compra automática de vehículo TOHI-001','AUTO-COMPRA-3','COMPLETADA',1,'2026-10-17 18:56:06','2026-10-17 18:56:06'),
(6,'TRX-202610-0006','2026-10-17',17,10,2026,7,NULL,3,NULL,3,1,600000.00,0.00,'Compra motor usado para Hilux reparación','REP-HILUX-MOTOR-001','COMPLETADA',1,'2026-10-17 18:56:06','2026-10-17 18:56:06'),
(7,'TRX-202610-0007','2026-10-17',17,10,2026,8,NULL,3,NULL,3,1,250000.00,0.00,'Pintura completa Hilux 2020','SERV-PINTURA-001','COMPLETADA',1,'2026-10-17 18:56:06','2026-10-17 18:56:06'),
(8,'TRX-202610-0008','2026-10-17',17,10,2026,1,5,3,NULL,3,1,10900000.00,50000.00,'Venta Hilux 2020 Reparado','VENTA-HILUX-2020-001','COMPLETADA',1,'2026-10-17 18:56:06','2026-10-17 18:56:06'),
(9,'TRX-202610-0009','2026-10-17',17,10,2026,7,NULL,NULL,2,1,1,70000.00,0.00,'Compra automática de repuesto REP-Toyota-2020-2024-0001 (Cant: 1)','AUTO-COMP-REP-000002','COMPLETADA',1,'2026-10-17 18:56:06','2026-10-17 18:56:06'),
(10,'TRX-202610-0010','2026-10-17',17,10,2026,2,3,NULL,2,1,1,110000.00,3300.00,'Venta Bomba de Agua Corolla gen12','VENTA-REP-BA-COR-001','COMPLETADA',1,'2026-10-17 18:56:06','2026-10-17 18:56:06'),
(11,'TRX-202610-0011','2026-10-17',17,10,2026,7,NULL,NULL,3,2,1,85000.00,0.00,'Compra automática de repuesto REP-Honda-2016-2021-0002 (Cant: 1)','AUTO-COMP-REP-000003','COMPLETADA',1,'2026-10-17 18:56:06','2026-10-17 18:56:06'),
(12,'TRX-202610-0012','2026-10-17',17,10,2026,2,4,NULL,3,2,1,140000.00,10000.00,'Venta Embrague Civic gen10','VENTA-REP-EMB-CIV-001','COMPLETADA',1,'2026-10-17 18:56:06','2026-10-17 18:56:06'),
(13,'TRX-202610-0013','2026-10-17',17,10,2026,15,NULL,NULL,NULL,NULL,1,20000.00,0.00,'Pago de patente municipal','EGRESO-PATENTE-JUL25','COMPLETADA',1,'2026-10-17 18:56:06','2026-10-17 18:56:06'),
(14,'TRX-202610-0014','2026-10-17',17,10,2026,15,NULL,NULL,NULL,NULL,1,15000.00,0.00,'Pago de impuesto municipal julio','EGRESO-IMP-MUN-JUL25','COMPLETADA',1,'2026-10-17 18:56:06','2026-10-17 18:56:06'),
(15,'TRX-202610-0015','2026-10-17',17,10,2026,14,NULL,NULL,NULL,NULL,1,105000.00,0.00,'Pago de electricidad, agua y teléfono','EGRESO-SERVPUB-JUL25','COMPLETADA',1,'2026-10-17 18:56:06','2026-10-17 18:56:06'),
(16,'TRX-202610-0016','2026-10-17',17,10,2026,16,NULL,NULL,NULL,NULL,1,227000.00,0.00,'Aporte patronal CCSS','EGRESO-CCSS-JUL25','COMPLETADA',1,'2026-10-17 18:56:06','2026-10-17 18:56:06'),
(17,'TRX-202610-0017','2026-10-17',17,10,2026,16,NULL,NULL,NULL,NULL,1,2120000.00,0.00,'Pago de salarios','EGRESO-SALARIOS-JUL25','COMPLETADA',1,'2026-10-17 18:56:06','2026-10-17 18:56:06'),
(18,'TRX-202610-0018','2026-10-17',17,10,2026,18,NULL,NULL,NULL,NULL,1,1000000.00,0.00,'Pago de préstamo bancario','EGRESO-PRESTAMO-JUL25','COMPLETADA',1,'2026-10-17 18:56:06','2026-10-17 18:56:06'),
(19,'TRX-202610-0019','2026-10-17',17,10,2026,18,NULL,NULL,NULL,NULL,1,56500.00,0.00,'Honorarios contadora externa','EGRESO-CONTADORA-JUL25','COMPLETADA',1,'2026-10-17 18:56:06','2026-10-17 18:56:06'),
(20,'TRX-202610-0020','2026-10-17',17,10,2026,18,NULL,NULL,NULL,NULL,1,35000.00,0.00,'Pago seguro riesgos del trabajo','EGRESO-CERO-RIESGOS-JUL25','COMPLETADA',1,'2026-10-17 18:56:06','2026-10-17 18:56:06');
/*!40000 ALTER TABLE `transacciones_financieras` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `user_profilePicture`
--

LOCK TABLES `user_profilePicture` WRITE;
/*!40000 ALTER TABLE `user_profilePicture` DISABLE KEYS */;
INSERT INTO `user_profilePicture` (`user_id`, `profile_picture`) VALUES (1,NULL),
(2,NULL),
(3,NULL);
/*!40000 ALTER TABLE `user_profilePicture` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` (`id`, `email`, `password_hash`, `rol_id`, `is_active`, `fecha_creacion`) VALUES (1,'admin@rodieja.com','$2a$10$poZvLjrn9Rm8tIJDo0x.Suv.3XD7FwNaiEmHmpgBpFplq9oP6E0.e',1,1,'2026-10-17 18:56:05'),
(2,'contador@rodieja.com','$2a$10$Mhs/gXgxWKAZrKTS4iXuEuhfmFbcbi/0FJWzm5O3P8B3Ff5/9muW2',2,1,'2026-10-17 18:56:05'),
(3,'colaborador@rodieja.com','$2a$10$Mhs/gXgxWKAZrKTS4iXuEuhfmFbcbi/0FJWzm5O3P8B3Ff5/9muW2',3,1,'2026-10-17 18:56:05');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping data for table `vehiculos`
--

LOCK TABLES `vehiculos` WRITE;
/*!40000 ALTER TABLE `vehiculos` DISABLE KEYS */;
INSERT INTO `vehiculos` (`id`, `codigo_vehiculo`, `generacion_id`, `imagen_url`, `anio`, `precio_compra`, `costo_grua`, `comisiones`, `inversion_total`, `costo_recuperado`, `costo_pendiente`, `traccion`, `transmision`, `combustible`, `cilindraje`, `fecha_ingreso`, `estado`, `precio_venta`, `fecha_venta`, `activo`, `notas`, `fecha_creacion`, `fecha_actualizacion`) VALUES (1,'TOCO-001',1,NULL,2023,10000000.00,50000.00,100000.00,10150000.00,12000000.00,-1850000.00,NULL,NULL,NULL,NULL,'2026-10-17','VENDIDO',12000000.00,'2026-10-17',1,NULL,'2026-10-17 18:56:06','2026-10-17 18:56:06'),
(2,'HOCI-001',2,NULL,2018,6000000.00,40000.00,80000.00,6120000.00,1800000.00,4320000.00,NULL,NULL,NULL,NULL,'2026-10-17','DESARMADO',NULL,NULL,1,NULL,'2026-10-17 18:56:06','2026-10-17 18:56:06'),
(3,'TOHI-001',3,NULL,2020,8000000.00,45000.00,90000.00,8135000.00,10050000.00,-1915000.00,NULL,NULL,NULL,NULL,'2026-10-17','VENDIDO',10900000.00,'2026-10-17',1,'Vehículo ingresado con daño en motor y carrocería, apto para reparación\n[2026-10-17] Reparación finalizada: motor y pintura. Vehículo listo para venta.','2026-10-17 18:56:06','2026-10-17 18:56:06');
/*!40000 ALTER TABLE `vehiculos` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*M!100616 SET NOTE_VERBOSITY=@OLD_NOTE_VERBOSITY */;

-- Dump completed on 2026-10-17 19:29:15
-- ============================================================
-- 04_datos.sql — REAL DATA snapshot (not mocks)
-- Generated: 2026-10-17T13:29:14
-- Loaded by: load_data.py (after setup_db.py)
-- ============================================================
SET FOREIGN_KEY_CHECKS = 0;
USE `sistema_vehicular`;


SET FOREIGN_KEY_CHECKS = 1;
