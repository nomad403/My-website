"use client"
import {useLanguage} from "@/contexts/LanguageContext"
import InterventionPanel from "@/components/shop/InterventionPanel"
export default function AdminInterventions(){const {language}=useLanguage();return <InterventionPanel admin language={language}/>}
